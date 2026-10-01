# -*- coding: utf-8 -*-
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.proactive import ProactiveCheckIn


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_check_in(row) -> ProactiveCheckIn:
    return ProactiveCheckIn(**dict(row))


class ProactiveRepository:
    def create(
        self,
        *,
        user_id: str,
        companion_id: str,
        kind: str,
        content: str,
        source_type: str,
        source_ref: str | None = None,
    ) -> ProactiveCheckIn:
        check_in_id = uuid.uuid4().hex
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO proactive_checkins (
                  id, user_id, companion_id, kind, content, status,
                  source_type, source_ref, created_at
                ) VALUES (?, ?, ?, ?, ?, 'offered', ?, ?, ?)
                """,
                (
                    check_in_id,
                    user_id,
                    companion_id,
                    kind,
                    content,
                    source_type,
                    source_ref,
                    now,
                ),
            )
        return self.get_by_id(check_in_id)

    def get_by_id(self, check_in_id: str) -> ProactiveCheckIn | None:
        with db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM proactive_checkins WHERE id = ?",
                (check_in_id,),
            )
            row = cursor.fetchone()
        return row_to_check_in(row) if row else None

    def find_latest(
        self,
        user_id: str,
        companion_id: str,
    ) -> ProactiveCheckIn | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM proactive_checkins
                WHERE user_id = ? AND companion_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id, companion_id),
            )
            row = cursor.fetchone()
        return row_to_check_in(row) if row else None

    def acknowledge(
        self,
        check_in_id: str,
        action: str,
    ) -> ProactiveCheckIn | None:
        timestamp_column = (
            "dismissed_at" if action == "dismissed" else "displayed_at"
        )
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                f"""
                UPDATE proactive_checkins
                SET status = ?, {timestamp_column} = ?
                WHERE id = ?
                """,
                (action, utc_now(), check_in_id),
            )
        return self.get_by_id(check_in_id)
