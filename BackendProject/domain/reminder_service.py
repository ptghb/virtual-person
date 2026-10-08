# -*- coding: utf-8 -*-
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from repositories.reminder_repository import ReminderRepository
from schemas.reminder import Reminder


class ReminderService:
    RECURRENCES = {"none", "daily", "weekly", "monthly"}

    def __init__(self, repository: ReminderRepository | None = None):
        self.repository = repository or ReminderRepository()

    @staticmethod
    def _parse_datetime(value: str) -> datetime:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=ZoneInfo("Asia/Shanghai"))
        return parsed

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
        clean_title = " ".join(title.strip().split())
        if not clean_title:
            raise ValueError("提醒内容不能为空")
        due = self._parse_datetime(due_at)
        if recurrence not in self.RECURRENCES:
            raise ValueError("不支持的重复规则")
        find_duplicate = getattr(self.repository, "find_active_duplicate", None)
        if callable(find_duplicate):
            duplicate = find_duplicate(
                user_id=user_id,
                companion_id=companion_id,
                title=clean_title,
                due_at=due.isoformat(),
                recurrence=recurrence,
            )
            if duplicate:
                return duplicate
        return self.repository.create(
            user_id=user_id,
            companion_id=companion_id,
            title=clean_title,
            due_at=due.isoformat(),
            recurrence=recurrence,
            source_type=source_type,
        )

    def complete(self, reminder_id: str) -> Reminder | None:
        return self.repository.update(
            reminder_id,
            status="completed",
            completed_at=datetime.now(timezone.utc).isoformat(),
        )

    def due(
        self,
        user_id: str,
        companion_id: str,
        now: datetime | None = None,
    ) -> list[Reminder]:
        now = now or datetime.now(timezone.utc)
        due_items = []
        for item in self.repository.list(user_id, companion_id):
            due_at = self._parse_datetime(item.due_at)
            if due_at.astimezone(timezone.utc) <= now:
                due_items.append(item)
        return due_items

    def mark_notified(self, reminder: Reminder) -> Reminder | None:
        due_at = self._parse_datetime(reminder.due_at)
        next_due = None
        if reminder.recurrence == "daily":
            next_due = due_at + timedelta(days=1)
        elif reminder.recurrence == "weekly":
            next_due = due_at + timedelta(days=7)
        elif reminder.recurrence == "monthly":
            next_due = due_at + timedelta(days=30)
        return self.repository.update(
            reminder.id,
            status="active" if next_due else "notified",
            due_at=next_due.isoformat() if next_due else reminder.due_at,
            last_notified_at=datetime.now(timezone.utc).isoformat(),
        )

    def extract_from_text(
        self,
        *,
        user_id: str,
        companion_id: str,
        text: str,
        now: datetime | None = None,
        timezone_name: str = "Asia/Shanghai",
    ) -> Reminder | None:
        if "提醒我" not in text:
            return None
        local_now = (now or datetime.now(timezone.utc)).astimezone(
            ZoneInfo(timezone_name)
        )
        match = re.search(
            r"(?:(每天)|(今天|明天|后天))?(?:早上|上午|中午|下午|晚上)?"
            r"(\d{1,2})(?:点|时)(半|\d{1,2}分)?(?:钟)?提醒我(.+)",
            text,
        )
        if not match:
            return None
        daily_word, day_word, hour_text, minute_text, title = match.groups()
        hour = int(hour_text)
        if "下午" in text or "晚上" in text:
            if hour < 12:
                hour += 12
        elif "中午" in text and hour < 11:
            hour += 12
        minute = 30 if minute_text == "半" else int((minute_text or "0").replace("分", ""))
        day_offset = {"今天": 0, "明天": 1, "后天": 2}.get(day_word, 0)
        due = (local_now + timedelta(days=day_offset)).replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0,
        )
        if day_word is None and due <= local_now:
            due += timedelta(days=1)
        recurrence = "daily" if daily_word else "none"
        return self.create(
            user_id=user_id,
            companion_id=companion_id,
            title=title.strip("，。！？ "),
            due_at=due.isoformat(),
            recurrence=recurrence,
            source_type="conversation",
        )


reminder_service = ReminderService()
