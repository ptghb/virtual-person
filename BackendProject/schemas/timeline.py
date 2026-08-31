# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TimelineEvent:
    id: str
    user_id: str
    companion_id: str
    session_id: Optional[str]
    event_type: str
    title: Optional[str]
    content: str
    emotional_valence: str
    importance: int
    source_memory_id: Optional[str]
    source_type: str
    occurred_at: str
    detected_at: str
    created_at: str


@dataclass
class TimelineDaySummary:
    date: str
    summary: str
    event_count: int
    highlights: list[str] = field(default_factory=list)
    last_occurred_at: Optional[str] = None
