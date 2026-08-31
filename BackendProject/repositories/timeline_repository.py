# -*- coding: utf-8 -*-
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.memory import MemoryItem, MemoryType
from schemas.timeline import TimelineDaySummary, TimelineEvent


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_timeline_event(row) -> TimelineEvent:
    return TimelineEvent(**dict(row))


class TimelineRepository:
    def create_from_memory(
        self,
        memory: MemoryItem,
        *,
        event_type: str | None = None,
        emotional_valence: str | None = None,
        occurred_at: str | None = None,
    ) -> TimelineEvent | None:
        if memory.memory_type not in {
            MemoryType.EVENT,
            MemoryType.FOLLOWUP,
            MemoryType.RELATIONSHIP,
        }:
            return None

        now = utc_now()
        normalized = memory.normalized_json or {}
        inferred_valence = emotional_valence or str(
            normalized.get("emotional_valence")
            or normalized.get("relationship_stage")
            or (
                "followup" if memory.memory_type == MemoryType.FOLLOWUP else "neutral"
            )
        )
        occurred = occurred_at or str(normalized.get("occurred_at") or memory.created_at or now)

        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT OR IGNORE INTO timeline_events (
                  id, user_id, companion_id, session_id, event_type, title, content,
                  emotional_valence, importance, source_memory_id, source_type,
                  occurred_at, detected_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid.uuid4().hex,
                    memory.user_id,
                    memory.companion_id,
                    memory.session_id,
                    event_type or memory.memory_type.value,
                    memory.title,
                    memory.content,
                    inferred_valence[:40] or "neutral",
                    memory.importance,
                    memory.id,
                    memory.source_type,
                    occurred,
                    now,
                    now,
                ),
            )
            cursor.execute(
                "SELECT * FROM timeline_events WHERE source_memory_id = ?",
                (memory.id,),
            )
            row = cursor.fetchone()
        return row_to_timeline_event(row) if row else None


    def list_daily_summaries(
        self,
        *,
        user_id: str,
        companion_id: str,
        limit: int = 30,
    ) -> list[TimelineDaySummary]:
        """按天汇总对话时间线。

        一天的摘要优先使用 session summary；同时合并当天的重要事件、待跟进、关系变化作为亮点。
        """
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT substr(created_at, 1, 10) AS day, content, updated_at AS occurred_at, importance
                FROM memory_items
                WHERE user_id = ?
                  AND companion_id = ?
                  AND memory_type = 'summary'
                  AND status = 'active'
                ORDER BY updated_at DESC
                LIMIT 300
                """,
                (user_id, companion_id),
            )
            summary_rows = cursor.fetchall()
            cursor.execute(
                """
                SELECT substr(occurred_at, 1, 10) AS day, event_type, title, content,
                       emotional_valence, importance, occurred_at
                FROM timeline_events
                WHERE user_id = ?
                  AND companion_id = ?
                ORDER BY occurred_at DESC, importance DESC
                LIMIT 500
                """,
                (user_id, companion_id),
            )
            event_rows = cursor.fetchall()

        grouped: dict[str, dict[str, object]] = {}
        for row in summary_rows:
            day = str(row["day"] or "未知日期")
            bucket = grouped.setdefault(day, {"summaries": [], "events": [], "last": None})
            bucket["summaries"].append(str(row["content"]))
            bucket["last"] = max(str(bucket["last"] or ""), str(row["occurred_at"] or ""))

        for row in event_rows:
            day = str(row["day"] or "未知日期")
            bucket = grouped.setdefault(day, {"summaries": [], "events": [], "last": None})
            title = row["title"] or row["event_type"]
            content = str(row["content"])
            event_text = f"{title}：{content}" if title else content
            bucket["events"].append({
                "text": event_text,
                "importance": int(row["importance"] or 3),
                "occurred_at": str(row["occurred_at"] or ""),
            })
            bucket["last"] = max(str(bucket["last"] or ""), str(row["occurred_at"] or ""))

        results: list[TimelineDaySummary] = []
        for day, bucket in grouped.items():
            summaries = [item for item in bucket["summaries"] if item]
            events = sorted(
                bucket["events"],
                key=lambda item: (item["importance"], item["occurred_at"]),
                reverse=True,
            )
            highlights = [item["text"] for item in events[:5]]
            if summaries:
                summary_text = "；".join(summaries[:3])
            elif highlights:
                summary_text = "这一天主要聊到：" + "；".join(highlights[:3])
            else:
                summary_text = "这一天有对话记录，但暂无可总结的重点。"
            results.append(TimelineDaySummary(
                date=day,
                summary=summary_text,
                event_count=len(events) + len(summaries),
                highlights=highlights,
                last_occurred_at=str(bucket["last"] or "") or None,
            ))

        results.sort(key=lambda item: item.last_occurred_at or item.date, reverse=True)
        return results[:limit]

    def delete_by_source_memory_id(self, source_memory_id: str) -> int:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM timeline_events WHERE source_memory_id = ?",
                (source_memory_id,),
            )
            return cursor.rowcount

    def list(
        self,
        *,
        user_id: str,
        companion_id: str,
        limit: int = 50,
        event_type: str | None = None,
    ) -> list[TimelineEvent]:
        sql = [
            """
            SELECT *
            FROM timeline_events
            WHERE user_id = ?
              AND companion_id = ?
            """
        ]
        params: list[object] = [user_id, companion_id]
        if event_type:
            sql.append("AND event_type = ?")
            params.append(event_type)
        sql.append("ORDER BY occurred_at DESC, detected_at DESC LIMIT ?")
        params.append(limit)
        with db_cursor() as cursor:
            cursor.execute("\n".join(sql), params)
            rows = cursor.fetchall()
        return [row_to_timeline_event(row) for row in rows]
