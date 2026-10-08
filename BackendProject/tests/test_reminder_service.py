import unittest
from datetime import datetime
from zoneinfo import ZoneInfo

from domain.reminder_service import ReminderService
from schemas.reminder import Reminder


class FakeReminderRepository:
    def __init__(self):
        self.items = []

    def create(self, **payload):
        item = Reminder(
            id=f"reminder_{len(self.items) + 1}",
            status="active",
            created_at="now",
            updated_at="now",
            completed_at=None,
            last_notified_at=None,
            **payload,
        )
        self.items.append(item)
        return item

    def find_active_duplicate(self, **payload):
        return next(
            (
                item
                for item in self.items
                if item.status == "active"
                and all(getattr(item, key) == value for key, value in payload.items())
            ),
            None,
        )

    def list(self, user_id, companion_id, status="active", limit=100):
        return [item for item in self.items if item.status == status][:limit]

    def update(self, reminder_id, **changes):
        item = next(item for item in self.items if item.id == reminder_id)
        for key, value in changes.items():
            setattr(item, key, value)
        return item


class ReminderServiceTests(unittest.TestCase):
    def test_extracts_tomorrow_evening_reminder(self):
        repository = FakeReminderRepository()
        service = ReminderService(repository)
        item = service.extract_from_text(
            user_id="user",
            companion_id="Hiyori",
            text="明天晚上8点提醒我吃药",
            now=datetime(2026, 10, 2, 10, tzinfo=ZoneInfo("Asia/Shanghai")),
        )
        self.assertIsNotNone(item)
        self.assertEqual(item.title, "吃药")
        self.assertEqual(item.due_at[:16], "2026-10-03T20:00")

    def test_daily_reminder_moves_to_next_day_after_notification(self):
        repository = FakeReminderRepository()
        service = ReminderService(repository)
        item = service.create(
            user_id="user",
            companion_id="Hiyori",
            title="喝水",
            due_at="2026-10-02T09:00:00+08:00",
            recurrence="daily",
        )
        updated = service.mark_notified(item)
        self.assertEqual(updated.status, "active")
        self.assertEqual(updated.due_at[:16], "2026-10-03T09:00")

    def test_extracts_daily_reminder(self):
        service = ReminderService(FakeReminderRepository())
        item = service.extract_from_text(
            user_id="user",
            companion_id="Hiyori",
            text="每天早上9点提醒我喝水",
            now=datetime(2026, 10, 2, 8, tzinfo=ZoneInfo("Asia/Shanghai")),
        )
        self.assertEqual(item.recurrence, "daily")
        self.assertEqual(item.title, "喝水")

    def test_duplicate_reminder_returns_existing_item(self):
        service = ReminderService(FakeReminderRepository())
        first = service.create(
            user_id="user",
            companion_id="Hiyori",
            title="喝水",
            due_at="2026-10-02T09:00:00+08:00",
            recurrence="daily",
        )
        second = service.create(
            user_id="user",
            companion_id="Hiyori",
            title="  喝水 ",
            due_at="2026-10-02T09:00:00+08:00",
            recurrence="daily",
        )
        self.assertEqual(first.id, second.id)
        self.assertEqual(len(service.repository.items), 1)


if __name__ == "__main__":
    unittest.main()
