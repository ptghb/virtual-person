# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class MemoryType(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    PINNED = "pinned"
    SUMMARY = "summary"
    BOUNDARY = "boundary"
    EVENT = "event"
    FOLLOWUP = "followup"
    RELATIONSHIP = "relationship"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    DELETED = "deleted"
    ARCHIVED = "archived"
    PENDING_CONFIRM = "pending_confirm"


@dataclass
class MemoryItem:
    id: str
    user_id: str
    companion_id: str
    session_id: Optional[str]
    memory_type: MemoryType
    status: MemoryStatus
    scope: str
    title: Optional[str]
    content: str
    normalized_json: Optional[dict[str, Any]]
    importance: int
    confidence: float
    recall_count: int
    source_type: str
    source_ref: Optional[str]
    ttl_at: Optional[str]
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class MemoryCreateInput:
    user_id: str
    companion_id: str
    session_id: Optional[str]
    memory_type: MemoryType
    content: str
    title: Optional[str] = None
    importance: int = 3
    confidence: float = 0.8
    source_type: str = "system"
    source_ref: Optional[str] = None
    normalized_json: Optional[dict[str, Any]] = None
    scope: str = "user"
    status: MemoryStatus = MemoryStatus.ACTIVE
    ttl_at: Optional[str] = None


@dataclass
class MemoryUpdateInput:
    title: Optional[str] = None
    content: Optional[str] = None
    importance: Optional[int] = None
    status: Optional[MemoryStatus] = None
    normalized_json: Optional[dict[str, Any]] = None


@dataclass
class MemoryQuery:
    user_id: str
    companion_id: str
    memory_types: Optional[list[MemoryType]] = None
    status: MemoryStatus = MemoryStatus.ACTIVE
    limit: int = 20
    keyword: Optional[str] = None
    session_id: Optional[str] = None
    include_deleted: bool = False


@dataclass
class ExtractedMemoryBatch:
    facts: list[MemoryCreateInput] = field(default_factory=list)
    events: list[MemoryCreateInput] = field(default_factory=list)
    followups: list[MemoryCreateInput] = field(default_factory=list)
    relationship: Optional[MemoryCreateInput] = None
    summary: Optional[MemoryCreateInput] = None
