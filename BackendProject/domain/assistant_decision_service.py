# -*- coding: utf-8 -*-
from __future__ import annotations

from typing import Any, Callable, Optional

from schemas.assistant import AssistantDecision


KNOWN_EMOTIONS = {
    "neutral",
    "happy",
    "shy",
    "sad",
    "worried",
    "wronged",
    "angry",
    "comforting",
    "playful",
    "sleepy",
}


class AssistantDecisionService:
    """把分散的表现字段收敛为一个可验证、可复用的回复决策。"""

    def build(
        self,
        *,
        reply_id: str,
        prompt: str,
        model_name: str,
        mode: str,
        has_image: bool,
        emotion_state: dict[str, Any],
        animation_selector: Callable[[str, str], int],
        expression_selector: Callable[[str, str], Optional[str]],
        photo_selector: Callable[[str], bool],
    ) -> AssistantDecision:
        emotion = str(emotion_state.get("emotion") or "neutral")
        if emotion not in KNOWN_EMOTIONS:
            emotion = "neutral"

        try:
            intensity = float(emotion_state.get("intensity") or 0.0)
        except (TypeError, ValueError):
            intensity = 0.0
        intensity = round(min(1.0, max(0.0, intensity)), 2)

        should_take_photo = (
            mode == "advanced"
            and not has_image
            and bool(photo_selector(prompt))
        )

        return AssistantDecision(
            reply_id=reply_id,
            emotion=emotion,
            emotion_label=str(emotion_state.get("emotion_label") or "平静"),
            emotion_intensity=intensity,
            emotion_reason=str(
                emotion_state.get("reason") or "当前对话氛围"
            ),
            animation_index=int(animation_selector(emotion, model_name)),
            expression=expression_selector(emotion, model_name),
            should_take_photo=should_take_photo,
            prompt=prompt,
        )


assistant_decision_service = AssistantDecisionService()
