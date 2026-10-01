# -*- coding: utf-8 -*-
from __future__ import annotations

from datetime import datetime, timezone

from infrastructure.db import db_cursor
from schemas.relationship import RelationshipProfile


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RelationshipRepository:
    def get_or_create(
        self, user_id: str, companion_id: str
    ) -> RelationshipProfile:
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT OR IGNORE INTO relationship_profiles (
                  user_id, companion_id, stage, affinity_score, trust_score,
                  interaction_count, shared_event_count, last_interaction_at,
                  created_at, updated_at
                ) VALUES (?, ?, '初识', 0, 0, 0, 0, NULL, ?, ?)
                """,
                (user_id, companion_id, now, now),
            )
        return self.get(user_id, companion_id)  # type: ignore[return-value]

    def get(self, user_id: str, companion_id: str) -> RelationshipProfile | None:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, companion_id, stage, affinity_score, trust_score,
                       interaction_count, shared_event_count, last_interaction_at,
                       created_at, updated_at
                FROM relationship_profiles
                WHERE user_id = ? AND companion_id = ?
                """,
                (user_id, companion_id),
            )
            row = cursor.fetchone()
        return RelationshipProfile(**dict(row)) if row else None

    def update(
        self,
        profile: RelationshipProfile,
    ) -> RelationshipProfile:
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE relationship_profiles
                SET stage = ?, affinity_score = ?, trust_score = ?,
                    interaction_count = ?, shared_event_count = ?,
                    last_interaction_at = ?, updated_at = ?
                WHERE user_id = ? AND companion_id = ?
                """,
                (
                    profile.stage,
                    profile.affinity_score,
                    profile.trust_score,
                    profile.interaction_count,
                    profile.shared_event_count,
                    now,
                    now,
                    profile.user_id,
                    profile.companion_id,
                ),
            )
        return self.get(profile.user_id, profile.companion_id)  # type: ignore[return-value]

    def reset(self, user_id: str, companion_id: str) -> RelationshipProfile:
        now = utc_now()
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO relationship_profiles (
                  user_id, companion_id, stage, affinity_score, trust_score,
                  interaction_count, shared_event_count, last_interaction_at,
                  created_at, updated_at
                ) VALUES (?, ?, '初识', 0, 0, 0, 0, NULL, ?, ?)
                ON CONFLICT(user_id, companion_id) DO UPDATE SET
                  stage = '初识', affinity_score = 0, trust_score = 0,
                  interaction_count = 0, shared_event_count = 0,
                  last_interaction_at = NULL, updated_at = excluded.updated_at
                """,
                (user_id, companion_id, now, now),
            )
        return self.get_or_create(user_id, companion_id)
