# -*- coding: utf-8 -*-
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from repositories.memory_repository import MemoryRepository
from repositories.proactive_repository import ProactiveRepository
from schemas.memory import MemoryQuery, MemoryStatus, MemoryType
from schemas.proactive import ProactiveCheckIn
from schemas.relationship import RelationshipProfile


class ProactiveService:
    def __init__(
        self,
        repository: ProactiveRepository | None = None,
        memory_repository: MemoryRepository | None = None,
        cooldown_hours: int = 12,
    ):
        self.repository = repository or ProactiveRepository()
        self.memory_repository = memory_repository or MemoryRepository()
        self.cooldown = timedelta(hours=cooldown_hours)

    @staticmethod
    def is_quiet_hour(local_hour: int) -> bool:
        return local_hour >= 23 or local_hour < 8

    @staticmethod
    def _parse_time(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed

    @staticmethod
    def _followup_message(content: str, importance: int) -> str:
        topic = content.strip()
        for prefix in ("后续可以跟进：", "后续跟进：", "待跟进："):
            if topic.startswith(prefix):
                topic = topic[len(prefix):].strip()
        if importance >= 4:
            return f"我还记得你提到“{topic}”，现在怎么样了？我有点惦记你。"
        return f"刚刚想起你之前说的“{topic}”，有新进展了吗？"

    @staticmethod
    def _return_message(local_hour: int) -> str:
        if 8 <= local_hour < 11:
            return "早上好呀，好一阵子没见到你了。今天也想听听你最近过得怎么样。"
        if 18 <= local_hour < 23:
            return "晚上好，好一阵子没见到你了。今天过得还好吗？"
        return "好一阵子没见到你了，最近过得怎么样？我一直很想听你说说。"

    def get_or_create(
        self,
        *,
        user_id: str,
        companion_id: str,
        local_hour: int,
        relationship_profile: RelationshipProfile | None = None,
        now: datetime | None = None,
        cooldown_hours: int | None = None,
    ) -> tuple[ProactiveCheckIn | None, str]:
        now = now or datetime.now(timezone.utc)
        if self.is_quiet_hour(local_hour):
            return None, "quiet_hours"

        latest = self.repository.find_latest(user_id, companion_id)
        if latest:
            created_at = self._parse_time(latest.created_at)
            if (
                latest.status == "offered"
                and created_at
                and now - created_at <= timedelta(minutes=30)
            ):
                return latest, "pending"
            cooldown = timedelta(
                hours=max(1, min(72, cooldown_hours or int(self.cooldown.total_seconds() / 3600)))
            )
            if created_at and now - created_at < cooldown:
                return None, "cooldown"

        followups = self.memory_repository.list(
            MemoryQuery(
                user_id=user_id,
                companion_id=companion_id,
                memory_types=[MemoryType.FOLLOWUP],
                status=MemoryStatus.ACTIVE,
                limit=1,
            )
        )
        if followups:
            followup = followups[0]
            return (
                self.repository.create(
                    user_id=user_id,
                    companion_id=companion_id,
                    kind="followup",
                    content=self._followup_message(
                        followup.content,
                        followup.importance,
                    ),
                    source_type="memory",
                    source_ref=followup.id,
                ),
                "created",
            )

        last_interaction = self._parse_time(
            relationship_profile.last_interaction_at
            if relationship_profile
            else None
        )
        if (
            relationship_profile
            and relationship_profile.interaction_count > 0
            and last_interaction
            and now - last_interaction >= timedelta(hours=36)
        ):
            return (
                self.repository.create(
                    user_id=user_id,
                    companion_id=companion_id,
                    kind="welcome_back",
                    content=self._return_message(local_hour),
                    source_type="relationship",
                    source_ref=None,
                ),
                "created",
            )

        return None, "no_candidate"

    def acknowledge(
        self,
        check_in_id: str,
        action: str,
    ) -> ProactiveCheckIn | None:
        if action not in {"displayed", "dismissed"}:
            raise ValueError("不支持的主动关心回执动作")
        return self.repository.acknowledge(check_in_id, action)


proactive_service = ProactiveService()
