# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ProactiveCheckIn:
    id: str
    user_id: str
    companion_id: str
    kind: str
    content: str
    status: str
    source_type: str
    source_ref: Optional[str]
    created_at: str
    displayed_at: Optional[str] = None
    dismissed_at: Optional[str] = None
