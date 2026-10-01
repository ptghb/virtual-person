import unittest
from datetime import datetime, timedelta, timezone

from domain.proactive_service import ProactiveService
from schemas.memory import MemoryItem, MemoryStatus, MemoryType
from schemas.proactive import ProactiveCheckIn
from schemas.relationship import RelationshipProfile


class FakeProactiveRepository:
    def __init__(self):
        self.latest = None
        self.created = []

    def find_latest(self, user_id, companion_id):
        return self.latest

    def create(self, **payload):
        item = ProactiveCheckIn(
            id="check_1",
            status="offered",
            created_at=datetime.now(timezone.utc).isoformat(),
            displayed_at=None,
            dismissed_at=None,
            **payload,
        )
        self.latest = item
        self.created.append(item)
        return item

    def acknowledge(self, check_in_id, action):
        if not self.latest or self.latest.id != check_in_id:
            return None
        self.latest.status = action
        return self.latest


class FakeMemoryRepository:
    def __init__(self, items=None):
        self.items = items or []

    def list(self, query):
        return self.items[: query.limit]


def followup(importance=5):
    now = datetime.now(timezone.utc).isoformat()
    return MemoryItem(
        id="memory_1",
        user_id="user",
        companion_id="Hiyori",
        session_id=None,
        memory_type=MemoryType.FOLLOWUP,
        status=MemoryStatus.ACTIVE,
        scope="user",
        title=None,
        content="后续可以跟进：今天的面试结果",
        normalized_json=None,
        importance=importance,
        confidence=0.9,
        recall_count=0,
        source_type="conversation",
        source_ref=None,
        ttl_at=None,
        created_at=now,
        updated_at=now,
    )


class ProactiveServiceTests(unittest.TestCase):
    def test_quiet_hours_do_not_create_check_in(self):
        repository = FakeProactiveRepository()
        service = ProactiveService(repository, FakeMemoryRepository([followup()]))
        item, reason = service.get_or_create(
            user_id="user",
            companion_id="Hiyori",
            local_hour=2,
        )
        self.assertIsNone(item)
        self.assertEqual(reason, "quiet_hours")
        self.assertEqual(repository.created, [])

    def test_followup_creates_natural_message(self):
        service = ProactiveService(
            FakeProactiveRepository(),
            FakeMemoryRepository([followup()]),
        )
        item, reason = service.get_or_create(
            user_id="user",
            companion_id="Hiyori",
            local_hour=10,
        )
        self.assertEqual(reason, "created")
        self.assertEqual(item.kind, "followup")
        self.assertIn("面试结果", item.content)
        self.assertEqual(item.source_ref, "memory_1")

    def test_recent_display_respects_cooldown(self):
        repository = FakeProactiveRepository()
        repository.latest = ProactiveCheckIn(
            id="old",
            user_id="user",
            companion_id="Hiyori",
            kind="followup",
            content="测试",
            status="displayed",
            source_type="memory",
            source_ref="memory_1",
            created_at=datetime.now(timezone.utc).isoformat(),
            displayed_at=datetime.now(timezone.utc).isoformat(),
        )
        service = ProactiveService(repository, FakeMemoryRepository([followup()]))
        item, reason = service.get_or_create(
            user_id="user",
            companion_id="Hiyori",
            local_hour=10,
        )
        self.assertIsNone(item)
        self.assertEqual(reason, "cooldown")

    def test_welcome_back_after_long_absence(self):
        service = ProactiveService(
            FakeProactiveRepository(),
            FakeMemoryRepository(),
        )
        old_time = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        profile = RelationshipProfile(
            user_id="user",
            companion_id="Hiyori",
            stage="熟悉",
            affinity_score=20,
            trust_score=10,
            interaction_count=5,
            shared_event_count=2,
            last_interaction_at=old_time,
            created_at=old_time,
            updated_at=old_time,
        )
        item, reason = service.get_or_create(
            user_id="user",
            companion_id="Hiyori",
            local_hour=20,
            relationship_profile=profile,
        )
        self.assertEqual(reason, "created")
        self.assertEqual(item.kind, "welcome_back")
        self.assertIn("晚上好", item.content)


if __name__ == "__main__":
    unittest.main()
