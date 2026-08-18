# -*- coding: utf-8 -*-
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from repositories.memory_repository import MemoryRepository
from schemas.memory import (
    MemoryCreateInput,
    MemoryItem,
    MemoryQuery,
    MemoryStatus,
    MemoryType,
    MemoryUpdateInput,
)


def normalize_memory_content(content: str) -> str:
    return " ".join(content.strip().split())


def extract_overlap_tokens(text: str) -> set[str]:
    compact = re.sub(r"\s+", "", text)
    return {
        compact[index:index + 2]
        for index in range(max(len(compact) - 1, 0))
        if len(compact[index:index + 2].strip()) == 2
    }


class MemoryService:
    def __init__(self, repository: MemoryRepository | None = None):
        self.repository = repository or MemoryRepository()

    def create_memory(self, payload: MemoryCreateInput) -> MemoryItem:
        payload.content = normalize_memory_content(payload.content)
        if payload.title:
            payload.title = payload.title.strip()

        if payload.memory_type == MemoryType.SUMMARY and payload.session_id:
            previous_summary = self.repository.find_active_summary(
                user_id=payload.user_id,
                companion_id=payload.companion_id,
                session_id=payload.session_id,
            )
            if previous_summary:
                if previous_summary.content == payload.content:
                    return previous_summary
                self.repository.update_status_by_id(
                    previous_summary.id,
                    MemoryStatus.SUPERSEDED,
                )

        if payload.memory_type == MemoryType.RELATIONSHIP:
            previous_relationship = self.repository.find_latest_active_by_type(
                user_id=payload.user_id,
                companion_id=payload.companion_id,
                memory_type=MemoryType.RELATIONSHIP,
            )
            if previous_relationship:
                if previous_relationship.content == payload.content:
                    return previous_relationship
                self.repository.update_status_by_id(
                    previous_relationship.id,
                    MemoryStatus.SUPERSEDED,
                )

        duplicate = self.repository.find_duplicate(
            payload.user_id,
            payload.companion_id,
            payload.memory_type,
            payload.content,
        )
        if duplicate:
            return duplicate
        return self.repository.create(payload)

    def upsert_pinned_memory(
        self,
        user_id: str,
        companion_id: str,
        content: str,
        title: str | None = None,
        session_id: str | None = None,
        importance: int = 5,
    ) -> MemoryItem:
        return self.create_memory(
            MemoryCreateInput(
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                memory_type=MemoryType.PINNED,
                content=content.strip(),
                title=title,
                importance=importance,
                confidence=1.0,
                source_type="manual",
            )
        )

    def list_memories(
        self,
        user_id: str,
        companion_id: str,
        memory_type: MemoryType | None = None,
        status: MemoryStatus = MemoryStatus.ACTIVE,
        limit: int = 20,
        keyword: str | None = None,
    ) -> list[MemoryItem]:
        if memory_type in (None, MemoryType.FOLLOWUP):
            self.refresh_followup_priorities(user_id, companion_id)
        memory_types = [memory_type] if memory_type else None
        return self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=memory_types,
                status=status,
                limit=limit,
                keyword=keyword,
            )
        )

    def update_memory(
        self,
        memory_id: str,
        title: str | None = None,
        content: str | None = None,
        importance: int | None = None,
        status: MemoryStatus | None = None,
        normalized_json: dict | None = None,
    ) -> MemoryItem | None:
        return self.repository.update(
            memory_id,
            MemoryUpdateInput(
                title=title.strip() if isinstance(title, str) else None,
                content=normalize_memory_content(content) if isinstance(content, str) else None,
                importance=importance,
                status=status,
                normalized_json=normalized_json,
            ),
        )

    def delete_memory(self, memory_id: str) -> MemoryItem | None:
        return self.repository.update(
            memory_id,
            MemoryUpdateInput(status=MemoryStatus.DELETED),
        )

    def archive_memory(self, memory_id: str) -> MemoryItem | None:
        return self.repository.update(
            memory_id,
            MemoryUpdateInput(status=MemoryStatus.ARCHIVED),
        )

    def refresh_followup_priorities(
        self,
        user_id: str,
        companion_id: str,
    ) -> int:
        active_followups = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.FOLLOWUP],
                status=MemoryStatus.ACTIVE,
                limit=20,
            )
        )
        now = datetime.now(timezone.utc)
        downgraded_count = 0
        for followup in active_followups:
            if not followup.ttl_at or followup.importance < 4:
                continue
            try:
                ttl_at = datetime.fromisoformat(followup.ttl_at)
            except ValueError:
                continue
            remaining = ttl_at - now
            if timedelta(0) < remaining <= timedelta(hours=24):
                normalized_json = dict(followup.normalized_json or {})
                if normalized_json.get("followup_style") != "light":
                    normalized_json["followup_style"] = "light"
                self.update_memory(
                    memory_id=followup.id,
                    importance=3,
                    normalized_json=normalized_json,
                )
                downgraded_count += 1
        return downgraded_count

    def resolve_followups_from_message(
        self,
        user_id: str,
        companion_id: str,
        user_message: str,
    ) -> int:
        completion_patterns = (
            r"完了",
            r"完成了",
            r"搞定了",
            r"结束了",
            r"处理好了",
            r"已经好了",
            r"已经解决了",
            r"做完了",
        )
        if not re.search("|".join(completion_patterns), user_message):
            return 0

        active_followups = self.repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.FOLLOWUP],
                status=MemoryStatus.ACTIVE,
                limit=10,
            )
        )
        if not active_followups:
            return 0

        message_tokens = extract_overlap_tokens(user_message)
        archived_count = 0
        for followup in active_followups:
            followup_tokens = extract_overlap_tokens(followup.content)
            if message_tokens & followup_tokens:
                self.archive_memory(followup.id)
                archived_count += 1
        return archived_count


memory_service = MemoryService()
