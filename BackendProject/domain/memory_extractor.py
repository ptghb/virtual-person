# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone

from services.llm_service import llm_service
from schemas.memory import ExtractedMemoryBatch, MemoryCreateInput, MemoryType


class MemoryExtractor:
    def _build_ttl_at(self, days: int | None) -> str | None:
        if not days or days <= 0:
            return None
        return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

    def _build_trigger_excerpt(self, user_message: str) -> str:
        return user_message.strip().replace("\n", " ")[:36]

    def _infer_relationship_stage(self, text: str) -> str:
        if re.search(r"(难过|委屈|压力大|焦虑|紧张|累|崩溃|烦)", text):
            return "安慰"
        if re.search(r"(想你|开心|喜欢|抱抱|陪你|想跟你|一起)", text):
            return "升温"
        if re.search(r"(提醒|面试|考试|汇报|加班|睡觉|早起)", text):
            return "陪伴"
        return "轻松闲聊"

    async def extract(
        self,
        user_id: str,
        companion_id: str,
        session_id: str,
        user_message: str,
        ai_message: str,
    ) -> ExtractedMemoryBatch:
        batch = await self._extract_with_llm(
            user_id=user_id,
            companion_id=companion_id,
            session_id=session_id,
            user_message=user_message,
            ai_message=ai_message,
        )
        if batch:
            return batch
        return self._extract_with_rules(
            user_id=user_id,
            companion_id=companion_id,
            session_id=session_id,
            user_message=user_message,
            ai_message=ai_message,
        )

    async def _extract_with_llm(
        self,
        user_id: str,
        companion_id: str,
        session_id: str,
        user_message: str,
        ai_message: str,
    ) -> ExtractedMemoryBatch | None:
        prompt = f"""请从下面这一轮对话中提取适合长期保存的记忆，只输出 JSON。

要求：
1. 提取稳定事实、偏好、称呼边界、重要事件、待跟进事项、关系状态和本轮摘要。
2. 不要提取纯临时情绪或明显无价值的碎片信息。
3. 若没有合适内容，相应数组返回空数组。
4. 输出格式固定为:
{{
  "facts": [
    {{
      "memory_type": "fact|preference|boundary",
      "title": "可选标题",
      "content": "记忆内容",
      "importance": 1-5,
      "confidence": 0-1
    }}
  ],
  "events": [
    {{
      "memory_type": "event",
      "title": "事件标题",
      "content": "共同经历或用户近期事件",
      "importance": 1-5,
      "confidence": 0-1
    }}
  ],
  "followups": [
    {{
      "memory_type": "followup",
      "title": "待跟进标题",
      "content": "后续可以自然追问的一件事",
      "ttl_days": 1-14,
      "importance": 1-5,
      "confidence": 0-1
    }}
  ],
  "relationship_state": {{
    "memory_type": "relationship",
    "title": "关系状态",
    "content": "当前适合怎样陪伴、最近气氛如何",
    "importance": 1-5,
    "confidence": 0-1
  }},
  "summary": "本轮摘要"
}}

用户消息：{user_message}
AI 回复：{ai_message}
"""
        try:
            response = await llm_service.simple_json(prompt)
            facts = self._build_memory_items(
                response.get("facts", []),
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                allowed_types={MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.BOUNDARY},
            )
            events = self._build_memory_items(
                response.get("events", []),
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                allowed_types={MemoryType.EVENT},
            )
            followups = self._build_memory_items(
                response.get("followups", []),
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                allowed_types={MemoryType.FOLLOWUP},
            )
            for followup in followups:
                followup.normalized_json = {
                    **(followup.normalized_json or {}),
                    "trigger_excerpt": self._build_trigger_excerpt(user_message),
                }
            relationship = self._build_single_memory_item(
                response.get("relationship_state"),
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                allowed_types={MemoryType.RELATIONSHIP},
                default_title="关系状态",
            )
            if relationship:
                relationship.normalized_json = {
                    **(relationship.normalized_json or {}),
                    "trigger_excerpt": self._build_trigger_excerpt(user_message),
                      "relationship_stage": self._infer_relationship_stage(
                          relationship.content
                      ),
                }
            summary_text = str(response.get("summary", "")).strip()
            summary = (
                MemoryCreateInput(
                    user_id=user_id,
                    companion_id=companion_id,
                    session_id=session_id,
                    memory_type=MemoryType.SUMMARY,
                    content=summary_text,
                    importance=2,
                    confidence=0.8,
                    source_type="system",
                )
                if summary_text
                else None
            )
            return ExtractedMemoryBatch(
                facts=facts,
                events=events,
                followups=followups,
                relationship=relationship,
                summary=summary,
            )
        except Exception as error:
            print(f"[MemoryExtractor] LLM 抽取失败，回退规则抽取: {error}")
            return None

    def _build_memory_items(
        self,
        raw_items,
        *,
        user_id: str,
        companion_id: str,
        session_id: str,
        allowed_types: set[MemoryType],
    ) -> list[MemoryCreateInput]:
        items: list[MemoryCreateInput] = []
        for item in raw_items or []:
            built = self._build_single_memory_item(
                item,
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                allowed_types=allowed_types,
            )
            if built:
                items.append(built)
        return items

    def _build_single_memory_item(
        self,
        raw_item,
        *,
        user_id: str,
        companion_id: str,
        session_id: str,
        allowed_types: set[MemoryType],
        default_title: str | None = None,
    ) -> MemoryCreateInput | None:
        if not isinstance(raw_item, dict):
            return None
        memory_type = raw_item.get("memory_type")
        if memory_type not in {member.value for member in allowed_types}:
            return None
        content = str(raw_item.get("content", "")).strip()
        if not content:
            return None
        return MemoryCreateInput(
            user_id=user_id,
            companion_id=companion_id,
            session_id=session_id,
            memory_type=MemoryType(memory_type),
            title=str(raw_item.get("title", "")).strip() or default_title,
            content=content,
            importance=max(1, min(int(raw_item.get("importance", 3)), 5)),
            confidence=float(raw_item.get("confidence", 0.8)),
            source_type="chat",
            ttl_at=self._build_ttl_at(int(raw_item.get("ttl_days", 0) or 0)),
            normalized_json={
                "followup_style": (
                    "focus"
                    if int(raw_item.get("importance", 3)) >= 4
                    else "light"
                )
            }
            if memory_type == MemoryType.FOLLOWUP.value
            else None,
        )

    def _extract_with_rules(
        self,
        user_id: str,
        companion_id: str,
        session_id: str,
        user_message: str,
        ai_message: str,
    ) -> ExtractedMemoryBatch:
        facts: list[MemoryCreateInput] = []
        events: list[MemoryCreateInput] = []
        followups: list[MemoryCreateInput] = []
        relationship: MemoryCreateInput | None = None
        content = user_message.strip()

        name_match = re.search(r"(?:我叫|叫我)([^，。！？,\s]{1,12})", content)
        if name_match:
            name = name_match.group(1).strip()
            facts.append(
                MemoryCreateInput(
                    user_id=user_id,
                    companion_id=companion_id,
                    session_id=session_id,
                    memory_type=MemoryType.BOUNDARY,
                    title="称呼偏好",
                    content=f"用户希望被称呼为{name}",
                    importance=5,
                    confidence=0.95,
                    source_type="chat",
                )
            )

        preference_match = re.search(r"我(?:喜欢|爱喝|爱吃|更喜欢)(.+)", content)
        if preference_match:
            preference = preference_match.group(1).strip("。！？，, ")
            if preference:
                facts.append(
                    MemoryCreateInput(
                        user_id=user_id,
                        companion_id=companion_id,
                        session_id=session_id,
                        memory_type=MemoryType.PREFERENCE,
                        title="用户偏好",
                        content=f"用户喜欢{preference}",
                        importance=3,
                        confidence=0.85,
                        source_type="chat",
                    )
                )

        event_match = re.search(r"(今天|昨天|刚刚|这周|周末|最近).{0,40}", content)
        if event_match:
            event_text = event_match.group(0).strip("。！？，, ")
            if len(event_text) >= 6:
                events.append(
                    MemoryCreateInput(
                        user_id=user_id,
                        companion_id=companion_id,
                        session_id=session_id,
                        memory_type=MemoryType.EVENT,
                        title="近期事件",
                        content=f"用户最近提到：{event_text}",
                        importance=3,
                        confidence=0.75,
                        source_type="chat",
                    )
                )

        followup_match = re.search(r"(提醒我.+|明天.+|下次.+|之后.+告诉你.+)", content)
        if followup_match:
            followup_text = followup_match.group(1).strip("。！？，, ")
            urgency_markers = ("明天", "马上", "今晚", "这周", "考试", "面试", "汇报")
            is_urgent = any(marker in followup_text for marker in urgency_markers)
            followups.append(
                MemoryCreateInput(
                    user_id=user_id,
                    companion_id=companion_id,
                    session_id=session_id,
                    memory_type=MemoryType.FOLLOWUP,
                    title="待跟进事项",
                    content=f"后续可以跟进：{followup_text}",
                    importance=5 if is_urgent else 3,
                    confidence=0.82,
                    source_type="chat",
                    ttl_at=self._build_ttl_at(3 if is_urgent else 7),
                    normalized_json={
                        "followup_style": "focus" if is_urgent else "light",
                        "trigger_excerpt": self._build_trigger_excerpt(content),
                    },
                )
            )

        if re.search(r"(好累|难过|委屈|压力大|好开心|很开心|紧张|焦虑)", content):
            relationship = MemoryCreateInput(
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                memory_type=MemoryType.RELATIONSHIP,
                title="关系状态",
                content=f"用户最近带着明显情绪来聊天，需要被温柔接住并继续跟进“{content[:28]}”这件事。",
                importance=4,
                confidence=0.78,
                source_type="chat",
                normalized_json={
                    "trigger_excerpt": self._build_trigger_excerpt(content),
                    "relationship_stage": self._infer_relationship_stage(content),
                },
            )

        summary_text = f"本轮对话中，用户说“{content[:60]}”，AI 回复了相应内容。"
        return ExtractedMemoryBatch(
            facts=facts,
            events=events,
            followups=followups,
            relationship=relationship,
            summary=MemoryCreateInput(
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                memory_type=MemoryType.SUMMARY,
                content=summary_text,
                importance=2,
                confidence=0.7,
                source_type="system",
            ),
        )


memory_extractor = MemoryExtractor()
