# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RelationshipProfile:
    user_id: str
    companion_id: str
    stage: str
    affinity_score: int
    trust_score: int
    interaction_count: int
    shared_event_count: int
    last_interaction_at: str | None
    created_at: str
    updated_at: str
