# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.memory import (
    MemoryCreateInput,
    MemoryItem,
    MemoryQuery,
    MemoryStatus,
    MemoryType,
    MemoryUpdateInput,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_memory_item(row) -> MemoryItem:
    payload = dict(row)
    payload["memory_type"] = MemoryType(payload["memory_type"])
    payload["status"] = MemoryStatus(payload["status"])
    payload["normalized_json"] = (
        json.loads(payload["normalized_json"]) if payload["normalized_json"] else None
    )
    return MemoryItem(**payload)


class MemoryRepository:
    def create(self, payload: MemoryCreateInput) -> MemoryItem:
        memory_id = uuid.uuid4().hex
        now = utc_now()
        normalized_json = (
            json.dumps(payload.normalized_json, ensure_ascii=False)
            if payload.normalized_json
            else None
        )
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO memory_items (
                  id, user_id, companion_id, session_id, memory_type, status,
                  scope, title, content, normalized_json, importance, confidence,
                  recall_count, source_type, source_ref, ttl_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
                """,
                (
                    memory_id,
                    payload.user_id,
                    payload.companion_id,
                    payload.session_id,
                    payload.memory_type.value,
                    payload.status.value,
                    payload.scope,
                    payload.title,
                    payload.content,
                    normalized_json,
                    payload.importance,
                    payload.confidence,
                    payload.source_type,
                    payload.source_ref,
                    payload.ttl_at,
                    now,
                    now,
                ),
            )
        return self.get_by_id(memory_id)

    def get_by_id(self, memory_id: str) -> MemoryItem | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM memory_items
                WHERE id = ?
                """,
                (memory_id,),
            )
            row = cursor.fetchone()
        return row_to_memory_item(row) if row else None

    def list(self, query: MemoryQuery) -> list[MemoryItem]:
        sql = [
            """
            SELECT *
            FROM memory_items
            WHERE user_id = ?
              AND companion_id = ?
            """
        ]
        params: list[object] = [query.user_id, query.companion_id]

        if not query.include_deleted:
            sql.append("AND status = ?")
            params.append(query.status.value)
            if query.status == MemoryStatus.ACTIVE:
                sql.append("AND (ttl_at IS NULL OR ttl_at > ?)")
                params.append(utc_now())

        if query.memory_types:
            placeholders = ", ".join("?" for _ in query.memory_types)
            sql.append(f"AND memory_type IN ({placeholders})")
            params.extend(memory_type.value for memory_type in query.memory_types)

        if query.session_id:
            sql.append("AND session_id = ?")
            params.append(query.session_id)

        if query.keyword:
            sql.append("AND content LIKE ?")
            params.append(f"%{query.keyword}%")

        if query.memory_types == [MemoryType.EVENT]:
            sql.append(
                """
                ORDER BY updated_at DESC, importance DESC
                LIMIT ?
                """
            )
        else:
            sql.append(
                """
                ORDER BY
                  CASE WHEN memory_type = 'pinned' THEN 0 ELSE 1 END,
                  importance DESC,
                  updated_at DESC
                LIMIT ?
                """
            )
        params.append(query.limit)

        with db_cursor() as cursor:
            cursor.execute("\n".join(sql), params)
            rows = cursor.fetchall()
        return [row_to_memory_item(row) for row in rows]

    def find_duplicate(
        self,
        user_id: str,
        companion_id: str,
        memory_type: MemoryType,
        content: str,
    ) -> MemoryItem | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM memory_items
                WHERE user_id = ?
                  AND companion_id = ?
                  AND memory_type = ?
                  AND status = ?
                  AND content = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (
                    user_id,
                    companion_id,
                    memory_type.value,
                    MemoryStatus.ACTIVE.value,
                    content,
                ),
            )
            row = cursor.fetchone()
        return row_to_memory_item(row) if row else None

    def find_active_summary(
        self,
        user_id: str,
        companion_id: str,
        session_id: str,
    ) -> MemoryItem | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM memory_items
                WHERE user_id = ?
                  AND companion_id = ?
                  AND session_id = ?
                  AND memory_type = ?
                  AND status = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (
                    user_id,
                    companion_id,
                    session_id,
                    MemoryType.SUMMARY.value,
                    MemoryStatus.ACTIVE.value,
                ),
            )
            row = cursor.fetchone()
        return row_to_memory_item(row) if row else None

    def find_latest_active_by_type(
        self,
        user_id: str,
        companion_id: str,
        memory_type: MemoryType,
        session_id: str | None = None,
    ) -> MemoryItem | None:
        sql = [
            """
            SELECT *
            FROM memory_items
            WHERE user_id = ?
              AND companion_id = ?
              AND memory_type = ?
              AND status = ?
            """
        ]
        params: list[object] = [
            user_id,
            companion_id,
            memory_type.value,
            MemoryStatus.ACTIVE.value,
        ]
        if session_id:
            sql.append("AND session_id = ?")
            params.append(session_id)
        sql.append("ORDER BY updated_at DESC LIMIT 1")
        with db_cursor() as cursor:
            cursor.execute("\n".join(sql), params)
            row = cursor.fetchone()
        return row_to_memory_item(row) if row else None

    def update_status_by_id(
        self,
        memory_id: str,
        status: MemoryStatus,
    ) -> MemoryItem | None:
        return self.update(memory_id, MemoryUpdateInput(status=status))

    def update(self, memory_id: str, payload: MemoryUpdateInput) -> MemoryItem | None:
        assignments: list[str] = ["updated_at = ?"]
        params: list[object] = [utc_now()]

        if payload.title is not None:
            assignments.append("title = ?")
            params.append(payload.title)
        if payload.content is not None:
            assignments.append("content = ?")
            params.append(payload.content)
        if payload.importance is not None:
            assignments.append("importance = ?")
            params.append(payload.importance)
        if payload.normalized_json is not None:
            assignments.append("normalized_json = ?")
            params.append(json.dumps(payload.normalized_json, ensure_ascii=False))
        if payload.status is not None:
            assignments.append("status = ?")
            params.append(payload.status.value)
            if payload.status == MemoryStatus.DELETED:
                assignments.append("deleted_at = ?")
                params.append(utc_now())

        params.append(memory_id)

        with db_cursor(commit=True) as cursor:
            cursor.execute(
                f"""
                UPDATE memory_items
                SET {", ".join(assignments)}
                WHERE id = ?
                """,
                params,
            )
        return self.get_by_id(memory_id)

    def increment_recall_count(self, memory_ids: list[str]) -> None:
        if not memory_ids:
            return
        placeholders = ", ".join("?" for _ in memory_ids)
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                f"""
                UPDATE memory_items
                SET recall_count = recall_count + 1
                WHERE id IN ({placeholders})
                """,
                memory_ids,
            )
