# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ResolvedIdentity:
    connection_id: str
    client_id: str
    user_id: str
    session_id: str
    companion_id: str
    mode: str = "chat"


@dataclass
class ConversationSession:
    id: str
    user_id: str
    companion_id: str
    mode: str
    latest_summary: Optional[str]
    metadata_json: Optional[str]
    started_at: str
    ended_at: Optional[str]
    updated_at: str
