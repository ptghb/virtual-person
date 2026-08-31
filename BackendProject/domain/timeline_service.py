# -*- coding: utf-8 -*-
from __future__ import annotations

from repositories.timeline_repository import TimelineRepository
from schemas.memory import MemoryItem
from schemas.timeline import TimelineDaySummary, TimelineEvent


class TimelineService:
    def __init__(self, repository: TimelineRepository | None = None):
        self.repository = repository or TimelineRepository()

    def record_memory(self, memory: MemoryItem) -> TimelineEvent | None:
        return self.repository.create_from_memory(memory)

    def delete_for_memory(self, memory_id: str) -> int:
        return self.repository.delete_by_source_memory_id(memory_id)

    def list_daily_summaries(
        self,
        user_id: str,
        companion_id: str,
        limit: int = 30,
    ) -> list[TimelineDaySummary]:
        return self.repository.list_daily_summaries(
            user_id=user_id,
            companion_id=companion_id,
            limit=limit,
        )

    def list_timeline(
        self,
        user_id: str,
        companion_id: str,
        limit: int = 50,
        event_type: str | None = None,
    ) -> list[TimelineEvent]:
        return self.repository.list(
            user_id=user_id,
            companion_id=companion_id,
            limit=limit,
            event_type=event_type,
        )


timeline_service = TimelineService()
