import unittest

from domain.memory_service import MemoryService
from schemas.memory import MemoryCreateInput, MemoryStatus, MemoryType


class FakeMemoryRepository:
    def __init__(self):
        self.items = []

    def find_active_summary(self, *args, **kwargs):
        return None

    def find_latest_active_by_type(self, *args, **kwargs):
        return None

    def find_duplicate(self, user_id, companion_id, memory_type, content):
        return next(
            (
                item
                for item in self.items
                if item.memory_type == memory_type
                and item.content == content
                and item.status == MemoryStatus.ACTIVE
            ),
            None,
        )

    def find_latest_active_by_title(
        self, user_id, companion_id, memory_type, title
    ):
        return next(
            (
                item
                for item in reversed(self.items)
                if item.memory_type == memory_type
                and item.title == title
                and item.status == MemoryStatus.ACTIVE
            ),
            None,
        )

    def create(self, payload):
        payload.id = f"memory_{len(self.items) + 1}"
        payload.created_at = "now"
        payload.updated_at = "now"
        payload.deleted_at = None
        payload.recall_count = 0
        self.items.append(payload)
        return payload

    def update(self, memory_id, payload):
        item = next(item for item in self.items if item.id == memory_id)
        if payload.status is not None:
            item.status = payload.status
        if payload.normalized_json is not None:
            item.normalized_json = payload.normalized_json
        return item

    def update_status_by_id(self, memory_id, status):
        return self.update(memory_id, type("Update", (), {
            "status": status,
            "normalized_json": None,
        })())


def payload(content, confidence=0.9):
    return MemoryCreateInput(
        user_id="user",
        companion_id="Hiyori",
        session_id="session",
        memory_type=MemoryType.PREFERENCE,
        title="饮品偏好",
        content=content,
        confidence=confidence,
        source_type="chat",
    )


class MemoryQualityTests(unittest.TestCase):
    def test_low_confidence_memory_waits_for_confirmation(self):
        service = MemoryService(FakeMemoryRepository())
        item = service.create_memory(payload("用户喜欢咖啡", confidence=0.5))
        self.assertEqual(item.status, MemoryStatus.PENDING_CONFIRM)
        self.assertEqual(item.normalized_json["quality_reason"], "low_confidence")

    def test_new_conflicting_memory_supersedes_old_one(self):
        repository = FakeMemoryRepository()
        service = MemoryService(repository)
        old = service.create_memory(payload("用户喜欢咖啡"))
        new = service.create_memory(payload("用户不喜欢咖啡"))
        self.assertEqual(old.status, MemoryStatus.SUPERSEDED)
        self.assertTrue(new.normalized_json["conflict_detected"])
        self.assertEqual(new.normalized_json["supersedes_memory_id"], old.id)


if __name__ == "__main__":
    unittest.main()
