# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import re
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from services.llm_service import llm_service
from schemas.memory import ExtractedMemoryBatch, MemoryCreateInput, MemoryType


class MemoryExtractor:
    def _local_now(self) -> datetime:
        tz_name = os.getenv("APP_TIMEZONE") or os.getenv("TZ") or "Asia/Shanghai"
        try:
            return datetime.now(ZoneInfo(tz_name))
        except Exception:
            return datetime.now(ZoneInfo("Asia/Shanghai"))

    def _build_ttl_at(self, days: int | None) -> str | None:
        if not days or days <= 0:
            return None
        return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

    def _end_of_local_day_utc(self, local_day, extra_days: int = 0) -> str:
        local_dt = datetime.combine(
            local_day + timedelta(days=extra_days),
            time(hour=23, minute=59, second=59),
            tzinfo=self._local_now().tzinfo,
        )
        return local_dt.astimezone(timezone.utc).isoformat()

    def _build_trigger_excerpt(self, user_message: str) -> str:
        return user_message.strip().replace("\n", " ")[:36]

    def _relative_dates(self) -> dict[str, str]:
        today = self._local_now().date()
        return {
            "昨天": (today - timedelta(days=1)).isoformat(),
            "今天": today.isoformat(),
            "明天": (today + timedelta(days=1)).isoformat(),
        }

    def _normalize_relative_date_text(self, text: str) -> str:
        normalized = text
        for word, date_text in self._relative_dates().items():
            normalized = normalized.replace(word, f"{date_text}这天")
        return normalized

    def _infer_occurred_date(self, text: str) -> str | None:
        date_match = re.search(r"20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}", text)
        if date_match:
            date_text = date_match.group(0).replace("年", "-").replace("月", "-").replace("/", "-").replace("日", "")
            parts = [part for part in date_text.split("-") if part]
            if len(parts) == 3:
                return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
        for word, date_text in self._relative_dates().items():
            if word in text:
                return date_text
        return None

    def _is_transient_schedule_text(self, text: str) -> bool:
        has_schedule_word = re.search(r"(上班|加班|休息|请假|放假|调休|下班|上学|上课)", text)
        has_time_scope = re.search(r"(今天|昨天|明天|周末|这周|本周|今晚|早上|中午|下午|晚上|20\d{2}[-/年]\d{1,2}[-/月]\d{1,2})", text)
        return bool(has_schedule_word and has_time_scope)

    def _is_ai_speculation(self, content: str) -> bool:
        return bool(re.search(r"(可能|大概|也许|应该是|是不是|该不会|猜)", content))

    def _prepare_memory_item(self, item: MemoryCreateInput, *, source_user_message: str) -> MemoryCreateInput | None:
        combined_text = f"{item.title or ''} {item.content}"

        # 临时日程/当天状态不应作为稳定 fact 长期保存，避免“昨天不上班”
        # 变成模型理解里的“今天不上班”。
        if item.memory_type == MemoryType.FACT and self._is_transient_schedule_text(combined_text):
            return None

        # facts/events 必须来自用户明确表达；如果内容本身带有猜测语气，丢弃。
        if item.memory_type in {MemoryType.FACT, MemoryType.EVENT} and self._is_ai_speculation(item.content):
            return None

        # 摘要也不要把 AI 未经确认的“今天不上班/不加班”等推断继续带进下一轮。
        if (
            item.memory_type == MemoryType.SUMMARY
            and re.search(r"(不用上班|不上班|不加班)", item.content)
            and not re.search(r"(不用上班|不上班|不加班)", source_user_message)
        ):
            return None

        occurred_date = self._infer_occurred_date(combined_text)
        if item.memory_type in {MemoryType.EVENT, MemoryType.FOLLOWUP, MemoryType.SUMMARY}:
            item.content = self._normalize_relative_date_text(item.content)
            if item.title:
                item.title = self._normalize_relative_date_text(item.title)

        if item.memory_type == MemoryType.EVENT:
            normalized_json = dict(item.normalized_json or {})
            if occurred_date:
                normalized_json["occurred_date"] = occurred_date
                normalized_json["time_scope"] = "day"
                normalized_json["is_relative_time_normalized"] = True
                item.normalized_json = normalized_json
            if self._is_transient_schedule_text(combined_text):
                try:
                    day = datetime.fromisoformat(occurred_date).date() if occurred_date else self._local_now().date()
                except ValueError:
                    day = self._local_now().date()
                # 日程状态只在该日后一两天内有主动检索价值，之后留在 timeline 即可。
                item.ttl_at = item.ttl_at or self._end_of_local_day_utc(day, extra_days=1)

        if item.memory_type == MemoryType.FOLLOWUP:
            normalized_json = dict(item.normalized_json or {})
            normalized_json.setdefault("trigger_excerpt", self._build_trigger_excerpt(source_user_message))
            item.normalized_json = normalized_json

        return item

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
        now = self._local_now()
        weekday = "一二三四五六日"[now.weekday()]
        prompt = f"""请从下面这一轮对话中提取适合长期保存的记忆，只输出 JSON。

当前日期：{now.year}年{now.month}月{now.day}日，星期{weekday}；时区：{now.tzinfo}。

要求：
1. 提取稳定事实、偏好、称呼边界、重要事件、待跟进事项、关系状态和本轮摘要。
2. 不要提取纯临时情绪或明显无价值的碎片信息。
3. facts 和 events 只能来自“用户消息”中明确表达的信息；AI 回复里的猜测、调侃、安慰、建议，未经用户确认，不能保存为用户事实或事件。
4. “今天/昨天/明天/周末/这周”等相对时间必须按当前日期换算成明确日期，不要在 facts/events/followups/summary 的 content 中保留这些相对时间词。例如：
   - 今天不上班 -> 用户在 {now.date().isoformat()} 不上班
   - 昨天不上班 -> 用户在 {(now.date() - timedelta(days=1)).isoformat()} 不上班
   - 明天加班 -> 用户在 {(now.date() + timedelta(days=1)).isoformat()} 加班
5. “某一天上班/不上班/加班/休息/请假”属于短期 event，不属于长期 fact；只有“用户通常周末不上班”这类长期规律才能保存为 fact。
6. summary 可以概括 AI 如何回应，但不能把 AI 未经用户确认的推断写成用户状态；例如用户只说“今天加班”，不要总结成“用户原本今天不上班却临时加班”。
7. 若没有合适内容，相应数组返回空数组。
8. 输出格式固定为:
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
                facts=[
                    item for item in (
                        self._prepare_memory_item(fact, source_user_message=user_message)
                        for fact in facts
                    ) if item
                ],
                events=[
                    item for item in (
                        self._prepare_memory_item(event, source_user_message=user_message)
                        for event in events
                    ) if item
                ],
                followups=[
                    item for item in (
                        self._prepare_memory_item(followup, source_user_message=user_message)
                        for followup in followups
                    ) if item
                ],
                relationship=relationship,
                summary=(
                    self._prepare_memory_item(summary, source_user_message=user_message)
                    if summary else None
                ),
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
        summary = MemoryCreateInput(
                user_id=user_id,
                companion_id=companion_id,
                session_id=session_id,
                memory_type=MemoryType.SUMMARY,
                content=summary_text,
                importance=2,
                confidence=0.7,
                source_type="system",
        )
        return ExtractedMemoryBatch(
            facts=[
                item for item in (
                    self._prepare_memory_item(fact, source_user_message=user_message)
                    for fact in facts
                ) if item
            ],
            events=[
                item for item in (
                    self._prepare_memory_item(event, source_user_message=user_message)
                    for event in events
                ) if item
            ],
            followups=[
                item for item in (
                    self._prepare_memory_item(followup, source_user_message=user_message)
                    for followup in followups
                ) if item
            ],
            relationship=relationship,
            summary=self._prepare_memory_item(summary, source_user_message=user_message),
        )


memory_extractor = MemoryExtractor()
