# -*- coding: utf-8 -*-
from __future__ import annotations

from datetime import datetime, timezone

from infrastructure.db import db_cursor


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserRepository:
    def upsert_user(self, user_id: str, display_name: str | None = None) -> None:
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO users (id, display_name, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  display_name = COALESCE(excluded.display_name, users.display_name),
                  updated_at = excluded.updated_at
                """,
                (user_id, display_name, now, now),
            )
