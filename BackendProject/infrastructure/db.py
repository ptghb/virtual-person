# -*- coding: utf-8 -*-
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


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
