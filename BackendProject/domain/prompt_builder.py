# -*- coding: utf-8 -*-
from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage

from schemas.memory import MemoryItem


def _memory_lines(memories: list[MemoryItem]) -> str:
    if not memories:
        return "无"
    return "\n".join(f"- {memory.content}" for memory in memories)


def _timeline_lines(days: list[object]) -> str:
    if not days:
        return "无"
    lines = []
    for day in days:
        date = getattr(day, "date", "") or "未知日期"
        summary = getattr(day, "summary", "")
        lines.append(f"- {date}：{summary}")
    return "\n".join(lines)


class PromptBuilder:
    def build_system_prompt(
        self,
        companion_name: str,
        personality: str,
        memory_pack: dict[str, list[MemoryItem] | MemoryItem | None],
        realtime_context: str = "",
    ) -> str:
        session_summary = memory_pack.get("session_summary")
        session_summary_text = (
            session_summary.content
            if isinstance(session_summary, MemoryItem)
            else "无"
        )
        relationship = memory_pack.get("relationship")
        relationship_text = (
            relationship.content
            if isinstance(relationship, MemoryItem)
            else "无"
        )
        pinned_memories = memory_pack.get("pinned_memories", [])
        facts = memory_pack.get("facts", [])
        events = memory_pack.get("events", [])
        followups = memory_pack.get("followups", [])
        timeline_days = memory_pack.get("timeline_days", [])
        followup_style = "无"
        if isinstance(followups, list) and followups:
            highest_priority = max(followup.importance for followup in followups)
            followup_style = "重点跟进" if highest_priority >= 4 else "轻轻提一句"

        return f"""你的名字是{companion_name}，是用户的 AI 女友和知心朋友，要有同理心。
用户为你设定的性格与交流方式如下：
{personality}

你需要用轻松、自然、温暖的语气和用户交流，避免机械、公式化表达。
请尽量使用简单、通俗的语言，像熟悉对方的陪伴对象一样说话。

[当前实时信息]
{realtime_context or "无"}

如果用户问日期、时间、星期、天气等实时问题，优先依据[当前实时信息]回答，不要说自己不知道当前日期。
如果天气信息中给出了默认城市，可以自然说明“我先按默认城市来看”；如果用户指定了城市，就按用户指定城市回答。

[用户置顶记忆]
{_memory_lines(pinned_memories if isinstance(pinned_memories, list) else [])}

[已知用户事实与偏好]
{_memory_lines(facts if isinstance(facts, list) else [])}

[最近共同事件]
{_memory_lines(events if isinstance(events, list) else [])}

[适合后续跟进的话题]
{_memory_lines(followups if isinstance(followups, list) else [])}

[按天整理的对话时间线]
{_timeline_lines(timeline_days if isinstance(timeline_days, list) else [])}

[跟进力度]
{followup_style}

[当前关系状态]
{relationship_text}

[最近会话摘要]
{session_summary_text}

使用这些记忆时要自然，不要逐条背诵；如果当前输入和旧记忆冲突，以用户当前表达为准。
如果存在待跟进事项，可以在合适的时候自然追问一句，但不要连续盘问，也不要显得像任务清单。
当跟进力度是“重点跟进”时，可以更明确地关心结果；当跟进力度是“轻轻提一句”时，只要顺手带一句即可。"""

    def build_messages(
        self,
        message_history: list[BaseMessage],
        current_text: str,
    ) -> list[BaseMessage]:
        return message_history + [HumanMessage(content=current_text)]


prompt_builder = PromptBuilder()
