# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class Reminder:
    id: str
    user_id: str
    companion_id: str
    title: str
    due_at: str
    recurrence: str
    status: str
    source_type: str
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    last_notified_at: Optional[str] = None
