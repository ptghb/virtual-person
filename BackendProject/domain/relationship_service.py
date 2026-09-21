# -*- coding: utf-8 -*-
from __future__ import annotations

import re

from repositories.relationship_repository import RelationshipRepository
from schemas.relationship import RelationshipProfile


class RelationshipService:
    """以可解释、可重置的规则维护陪伴关系进度。

    分数只反映双方有效互动，不作为用户价值或权限判断依据。
    """

    STAGES = (
        (0, "初识"),
        (20, "熟悉"),
        (50, "信任"),
        (80, "默契"),
    )
    WARMTH_PATTERN = re.compile(r"谢谢|开心|喜欢|想你|抱抱|一起|陪我|好耶|太棒|爱你")
    VULNERABILITY_PATTERN = re.compile(r"难过|委屈|焦虑|压力|害怕|紧张|累|崩溃|孤独|睡不着")
    SHARED_EVENT_PATTERN = re.compile(r"一起|约好|完成了|记得|上次|答应|庆祝|复习|电影")

    def __init__(self, repository: RelationshipRepository | None = None):
        self.repository = repository or RelationshipRepository()

    @classmethod
    def stage_for(cls, affinity_score: int, trust_score: int) -> str:
        effective_score = min(100, round(affinity_score * 0.6 + trust_score * 0.4))
        return next(
            stage for threshold, stage in reversed(cls.STAGES)
            if effective_score >= threshold
        )

    def get_profile(self, user_id: str, companion_id: str) -> RelationshipProfile:
        return self.repository.get_or_create(user_id, companion_id)

    def record_interaction(
        self,
        *,
        user_id: str,
        companion_id: str,
        user_message: str,
        has_shared_event: bool = False,
    ) -> RelationshipProfile:
        profile = self.get_profile(user_id, companion_id)
        text = user_message.strip()
        affinity_delta = 2 + (2 if self.WARMTH_PATTERN.search(text) else 0)
        trust_delta = 1 + (2 if self.VULNERABILITY_PATTERN.search(text) else 0)
        is_shared_event = has_shared_event or bool(self.SHARED_EVENT_PATTERN.search(text))
        if is_shared_event:
            affinity_delta += 1

        profile.affinity_score = min(100, profile.affinity_score + affinity_delta)
        profile.trust_score = min(100, profile.trust_score + trust_delta)
        profile.interaction_count += 1
        profile.shared_event_count += int(is_shared_event)
        profile.stage = self.stage_for(profile.affinity_score, profile.trust_score)
        return self.repository.update(profile)

    def reset_profile(self, user_id: str, companion_id: str) -> RelationshipProfile:
        return self.repository.reset(user_id, companion_id)


relationship_service = RelationshipService()
