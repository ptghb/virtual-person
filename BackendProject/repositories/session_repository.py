# -*- coding: utf-8 -*-
from __future__ import annotations

import json
from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.session import ConversationSession


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SessionRepository:
    def upsert_session(
        self,
        session_id: str,
        user_id: str,
        companion_id: str,
        mode: str,
        latest_summary: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        now = utc_now()
        metadata_json = json.dumps(metadata, ensure_ascii=False) if metadata else None
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO conversation_sessions (
                  id, user_id, companion_id, mode, latest_summary,
                  metadata_json, started_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  user_id = excluded.user_id,
                  companion_id = excluded.companion_id,
                  mode = excluded.mode,
                  latest_summary = COALESCE(excluded.latest_summary, conversation_sessions.latest_summary),
                  metadata_json = COALESCE(excluded.metadata_json, conversation_sessions.metadata_json),
                  updated_at = excluded.updated_at
                """,
                (
                    session_id,
                    user_id,
                    companion_id,
                    mode,
                    latest_summary,
                    metadata_json,
                    now,
                    now,
                ),
            )

    def update_summary(self, session_id: str, summary: str) -> None:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE conversation_sessions
                SET latest_summary = ?, updated_at = ?
                WHERE id = ?
                """,
                (summary, utc_now(), session_id),
            )

    def get_session(self, session_id: str) -> ConversationSession | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, companion_id, mode, latest_summary,
                       metadata_json, started_at, ended_at, updated_at
                FROM conversation_sessions
                WHERE id = ?
                """,
                (session_id,),
            )
            row = cursor.fetchone()
        if not row:
            return None
        return ConversationSession(**dict(row))
