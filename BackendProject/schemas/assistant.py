# -*- coding: utf-8 -*-
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Optional


@dataclass(frozen=True)
class AssistantDecision:
    """一次对话回复配套的统一表现决策。

    reply 文本仍由流式 LLM 通道生成；情绪、表情、动作和拍照指令在
    回复开始前一次性确定，并通过同一份结构化数据发送给客户端。
    """

    reply_id: str
    emotion: str
    emotion_label: str
    emotion_intensity: float
    emotion_reason: str
    animation_index: int
    expression: Optional[str]
    should_take_photo: bool
    prompt: str
    source: str = "conversation_state"
    protocol_version: str = "2.0"

    def to_dict(self) -> dict:
        return asdict(self)

    def to_legacy_meta(self) -> dict:
        """保留现有前端字段，同时附带新版 decision 对象。"""
        payload = self.to_dict()
        return {
            "reply_id": self.reply_id,
            "animation_index": self.animation_index,
            "emotion": self.emotion,
            "emotion_label": self.emotion_label,
            "emotion_intensity": self.emotion_intensity,
            "emotion_reason": self.emotion_reason,
            "expression": self.expression,
            "should_take_photo": self.should_take_photo,
            "prompt": self.prompt,
            "decision": payload,
            "protocol_version": self.protocol_version,
        }
