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

    def record_emotion(
        self,
        *,
        user_id: str,
        companion_id: str,
        session_id: str | None,
        emotion: str,
        emotion_label: str,
        intensity: float,
        reason: str,
    ) -> None:
        """记录一轮对话的情绪状态到时间线。"""
        self.repository.create_emotion_event(
            user_id=user_id,
            companion_id=companion_id,
            session_id=session_id,
            emotion=emotion,
            emotion_label=emotion_label,
            intensity=intensity,
            reason=reason,
        )

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

    def get_emotion_history(
        self,
        session_id: str,
        limit: int = 20,
    ) -> list[dict]:
        """获取指定会话的最近情绪变化历史，按时间正序返回。"""
        return self.repository.get_recent_emotion_events(
            session_id=session_id,
            limit=limit,
        )


timeline_service = TimelineService()
