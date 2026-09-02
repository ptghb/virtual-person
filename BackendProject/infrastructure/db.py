# -*- coding: utf-8 -*-
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
import os
import re
from pathlib import Path
from typing import Iterator
from zoneinfo import ZoneInfo


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "app.db"


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_data_dir()
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def db_cursor(commit: bool = False) -> Iterator[sqlite3.Cursor]:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        yield cursor
        if commit:
            connection.commit()
    finally:
        cursor.close()
        connection.close()


def init_db() -> None:
    ensure_data_dir()
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              display_name TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS companions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              base_personality TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversation_sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              companion_id TEXT NOT NULL,
              mode TEXT NOT NULL,
              latest_summary TEXT,
              metadata_json TEXT,
              started_at TEXT NOT NULL,
              ended_at TEXT,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (companion_id) REFERENCES companions(id)
            );

            CREATE TABLE IF NOT EXISTS memory_items (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              companion_id TEXT NOT NULL,
              session_id TEXT,
              memory_type TEXT NOT NULL,
              status TEXT NOT NULL,
              scope TEXT NOT NULL DEFAULT 'user',
              title TEXT,
              content TEXT NOT NULL,
              normalized_json TEXT,
              importance INTEGER NOT NULL DEFAULT 3,
              confidence REAL NOT NULL DEFAULT 0.8,
              recall_count INTEGER NOT NULL DEFAULT 0,
              source_type TEXT NOT NULL,
              source_ref TEXT,
              ttl_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              deleted_at TEXT,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (companion_id) REFERENCES companions(id),
              FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user_companion
            ON conversation_sessions(user_id, companion_id, updated_at DESC);

            CREATE TABLE IF NOT EXISTS timeline_events (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              companion_id TEXT NOT NULL,
              session_id TEXT,
              event_type TEXT NOT NULL,
              title TEXT,
              content TEXT NOT NULL,
              emotional_valence TEXT NOT NULL DEFAULT 'neutral',
              importance INTEGER NOT NULL DEFAULT 3,
              source_memory_id TEXT UNIQUE,
              source_type TEXT NOT NULL,
              occurred_at TEXT NOT NULL,
              detected_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (companion_id) REFERENCES companions(id),
              FOREIGN KEY (session_id) REFERENCES conversation_sessions(id),
              FOREIGN KEY (source_memory_id) REFERENCES memory_items(id)
            );

            CREATE INDEX IF NOT EXISTS idx_timeline_user_companion
            ON timeline_events(user_id, companion_id, occurred_at DESC);

            CREATE INDEX IF NOT EXISTS idx_memory_active
            ON memory_items(user_id, companion_id, status, memory_type, updated_at DESC);

            INSERT OR IGNORE INTO timeline_events (
              id, user_id, companion_id, session_id, event_type, title, content,
              emotional_valence, importance, source_memory_id, source_type,
              occurred_at, detected_at, created_at
            )
            SELECT
              lower(hex(randomblob(16))), user_id, companion_id, session_id,
              memory_type, title, content,
              CASE
                WHEN memory_type = 'relationship' THEN 'relationship'
                WHEN memory_type = 'followup' THEN 'followup'
                ELSE 'neutral'
              END,
              importance, id, source_type, created_at, updated_at, created_at
            FROM memory_items
            WHERE memory_type IN ('event', 'followup', 'relationship')
              AND status IN ('active', 'archived', 'superseded');
            """
        )
        connection.commit()
        cleanup_relative_time_memories(connection)


def _app_timezone() -> ZoneInfo:
    tz_name = os.getenv("APP_TIMEZONE") or os.getenv("TZ") or "Asia/Shanghai"
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return ZoneInfo("Asia/Shanghai")


def _parse_iso_datetime(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        parsed = datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _relative_dates_for_created_at(created_at: str) -> dict[str, str]:
    local_day = _parse_iso_datetime(created_at).astimezone(_app_timezone()).date()
    return {
        "昨天": (local_day - timedelta(days=1)).isoformat(),
        "今天": local_day.isoformat(),
        "明天": (local_day + timedelta(days=1)).isoformat(),
    }


def _normalize_relative_time_text(text: str | None, created_at: str) -> str | None:
    if not text:
        return text
    normalized = text
    for word, date_text in _relative_dates_for_created_at(created_at).items():
        normalized = normalized.replace(word, f"{date_text}这天")
    return normalized


def _is_transient_schedule_text(text: str) -> bool:
    has_schedule_word = any(
        word in text
        for word in ("上班", "加班", "休息", "请假", "放假", "调休", "下班", "上学", "上课")
    )
    has_time_scope = any(
        word in text
        for word in ("今天", "昨天", "明天", "周末", "这周", "本周", "今晚", "早上", "中午", "下午", "晚上")
    ) or bool(re.search(r"20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}", text))
    return has_schedule_word and has_time_scope


def _looks_like_speculative_user_fact(text: str) -> bool:
    return any(word in text for word in ("可能", "大概", "也许", "应该是", "是不是", "该不会", "猜"))


def _extract_absolute_date(text: str) -> date | None:
    match = re.search(r"(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})", text)
    if not match:
        return None
    try:
        return datetime(
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
            tzinfo=_app_timezone(),
        ).date()
    except ValueError:
        return None


def cleanup_relative_time_memories(connection: sqlite3.Connection) -> None:
    """一次性清理旧相对时间记忆，防止“旧今天”被当成当前今天。

    - event/followup/summary/relationship：把今天/昨天/明天按创建日期写成绝对日期。
    - fact：如果是某天上班/加班/休息等临时日程，归档；它不该作为长期事实保留。
    """
    cursor = connection.cursor()
    now = datetime.now(timezone.utc).isoformat()
    rows = cursor.execute(
        """
        SELECT id, memory_type, title, content, created_at, status
        FROM memory_items
        WHERE status = 'active'
          AND (
            content LIKE '%今天%' OR content LIKE '%昨天%' OR content LIKE '%明天%'
            OR title LIKE '%今天%' OR title LIKE '%昨天%' OR title LIKE '%明天%'
            OR content LIKE '%可能%' OR content LIKE '%是不是%' OR content LIKE '%该不会%'
            OR title LIKE '%可能%' OR title LIKE '%是不是%' OR title LIKE '%该不会%'
          )
        """
    ).fetchall()
    for row in rows:
        combined_text = f"{row['title'] or ''} {row['content'] or ''}"
        if (
            row["memory_type"] == "fact"
            and _is_transient_schedule_text(combined_text)
        ) or (
            row["memory_type"] in {"fact", "event"}
            and _looks_like_speculative_user_fact(combined_text)
            and _is_transient_schedule_text(combined_text)
        ):
            cursor.execute(
                """
                UPDATE memory_items
                SET status = 'archived', updated_at = ?
                WHERE id = ?
                """,
                (now, row["id"]),
            )
            continue
        normalized_title = _normalize_relative_time_text(row["title"], row["created_at"])
        normalized_content = _normalize_relative_time_text(row["content"], row["created_at"])
        if normalized_title != row["title"] or normalized_content != row["content"]:
            cursor.execute(
                """
                UPDATE memory_items
                SET title = ?, content = ?, updated_at = ?
                WHERE id = ?
                """,
                (normalized_title, normalized_content, now, row["id"]),
            )
            cursor.execute(
                """
                UPDATE timeline_events
                SET title = ?, content = ?
                WHERE source_memory_id = ?
                """,
                (normalized_title, normalized_content, row["id"]),
            )

    timeline_rows = cursor.execute(
        """
        SELECT id, title, content, created_at
        FROM timeline_events
        WHERE content LIKE '%今天%' OR content LIKE '%昨天%' OR content LIKE '%明天%'
           OR title LIKE '%今天%' OR title LIKE '%昨天%' OR title LIKE '%明天%'
        """
    ).fetchall()
    for row in timeline_rows:
        normalized_title = _normalize_relative_time_text(row["title"], row["created_at"])
        normalized_content = _normalize_relative_time_text(row["content"], row["created_at"])
        if normalized_title != row["title"] or normalized_content != row["content"]:
            cursor.execute(
                """
                UPDATE timeline_events
                SET title = ?, content = ?
                WHERE id = ?
                """,
                (normalized_title, normalized_content, row["id"]),
            )

    current_local_day = datetime.now(_app_timezone()).date()
    transient_rows = cursor.execute(
        """
        SELECT id, title, content
        FROM memory_items
        WHERE status = 'active'
          AND memory_type IN ('event', 'followup')
        """
    ).fetchall()
    for row in transient_rows:
        combined_text = f"{row['title'] or ''} {row['content'] or ''}"
        occurred_day = _extract_absolute_date(combined_text)
        if (
            occurred_day
            and _is_transient_schedule_text(combined_text)
            and occurred_day + timedelta(days=1) < current_local_day
        ):
            cursor.execute(
                """
                UPDATE memory_items
                SET status = 'archived', updated_at = ?
                WHERE id = ?
                """,
                (now, row["id"]),
            )

    polluted_summary_rows = cursor.execute(
        """
        SELECT id, content
        FROM memory_items
        WHERE status = 'active'
          AND memory_type = 'summary'
          AND (content LIKE '%原本%不用上班%' OR content LIKE '%原本%不上班%' OR content LIKE '%原本%不加班%')
        """
    ).fetchall()
    for row in polluted_summary_rows:
        cursor.execute(
            """
            UPDATE memory_items
            SET status = 'archived', updated_at = ?
            WHERE id = ?
            """,
            (now, row["id"]),
        )
    connection.commit()
