# -*- coding: utf-8 -*-
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.reminder import Reminder


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_reminder(row) -> Reminder:
    return Reminder(**dict(row))


class ReminderRepository:
    def find_active_duplicate(
        self,
        *,
        user_id: str,
        companion_id: str,
        title: str,
        due_at: str,
        recurrence: str,
    ) -> Reminder | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM reminders
                WHERE user_id = ? AND companion_id = ? AND title = ?
                  AND due_at = ? AND recurrence = ? AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id, companion_id, title, due_at, recurrence),
            )
            row = cursor.fetchone()
        return row_to_reminder(row) if row else None

    def create(
        self,
        *,
        user_id: str,
        companion_id: str,
        title: str,
        due_at: str,
        recurrence: str = "none",
        source_type: str = "manual",
    ) -> Reminder:
        reminder_id = uuid.uuid4().hex
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO reminders (
                  id, user_id, companion_id, title, due_at, recurrence,
                  status, source_type, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (
                    reminder_id,
                    user_id,
                    companion_id,
                    title,
                    due_at,
                    recurrence,
                    source_type,
                    now,
                    now,
                ),
            )
        return self.get(reminder_id)

    def get(self, reminder_id: str) -> Reminder | None:
        with db_cursor() as cursor:
            cursor.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
            row = cursor.fetchone()
        return row_to_reminder(row) if row else None

    def list(
        self,
        user_id: str,
        companion_id: str,
        status: str = "active",
        limit: int = 100,
    ) -> list[Reminder]:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM reminders
                WHERE user_id = ? AND companion_id = ? AND status = ?
                ORDER BY due_at ASC
                LIMIT ?
                """,
                (user_id, companion_id, status, limit),
            )
            rows = cursor.fetchall()
        return [row_to_reminder(row) for row in rows]

    def update(self, reminder_id: str, **changes) -> Reminder | None:
        allowed = {
            "title",
            "due_at",
            "recurrence",
            "status",
            "completed_at",
            "last_notified_at",
        }
        values = {key: value for key, value in changes.items() if key in allowed}
        if not values:
            return self.get(reminder_id)
        values["updated_at"] = utc_now()
        assignments = ", ".join(f"{key} = ?" for key in values)
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                f"UPDATE reminders SET {assignments} WHERE id = ?",
                [*values.values(), reminder_id],
            )
        return self.get(reminder_id)

    def delete(self, reminder_id: str) -> bool:
        with db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
            return cursor.rowcount > 0
