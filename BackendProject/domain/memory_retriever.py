# -*- coding: utf-8 -*-
from __future__ import annotations

from domain.memory_service import memory_service
from repositories.memory_repository import MemoryRepository
from schemas.memory import MemoryItem, MemoryQuery, MemoryStatus, MemoryType


class MemoryRetriever:
    def __init__(self, repository: MemoryRepository | None = None):
        self.repository = repository or MemoryRepository()

    def retrieve(
        self,
        user_id: str,
        companion_id: str,
        current_text: str,
        session_id: str | None = None,
    ) -> dict[str, list[MemoryItem] | MemoryItem | None]:
        memory_service.refresh_followup_priorities(user_id, companion_id)
        pinned_memories = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.PINNED],
                status=MemoryStatus.ACTIVE,
                limit=5,
            )
        )

        keyword = current_text.strip()[:20] or None
        related_facts = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.BOUNDARY],
                status=MemoryStatus.ACTIVE,
                limit=5,
                keyword=keyword,
            )
        )
        if not related_facts:
            related_facts = self.repository.list(
                MemoryQuery(
                    user_id=user_id,
                    companion_id=companion_id,
                    memory_types=[MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.BOUNDARY],
                    status=MemoryStatus.ACTIVE,
                    limit=5,
                )
            )

        summaries = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                memory_types=[MemoryType.SUMMARY],
                status=MemoryStatus.ACTIVE,
                limit=1,
            )
        )
        events = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.EVENT],
                status=MemoryStatus.ACTIVE,
                limit=3,
                keyword=keyword,
            )
        )
        if not events:
            events = self.repository.list(
                MemoryQuery(
                    user_id=user_id,
                    companion_id=companion_id,
                    memory_types=[MemoryType.EVENT],
                    status=MemoryStatus.ACTIVE,
                    limit=3,
                )
            )
        followups = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.FOLLOWUP],
                status=MemoryStatus.ACTIVE,
                limit=3,
            )
        )
        relationships = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.RELATIONSHIP],
                status=MemoryStatus.ACTIVE,
                limit=1,
            )
        )
        recalled_ids = [
            memory.id
            for memory in [
                *pinned_memories,
                *related_facts,
                *summaries,
                *events,
                *followups,
                *relationships,
            ]
            if memory
        ]
        self.repository.increment_recall_count(recalled_ids)
        return {
            "pinned_memories": pinned_memories,
            "facts": related_facts,
            "events": events,
            "followups": followups,
            "relationship": relationships[0] if relationships else None,
            "session_summary": summaries[0] if summaries else None,
        }


memory_retriever = MemoryRetriever()
