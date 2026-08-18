# -*- coding: utf-8 -*-
from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage

from schemas.memory import MemoryItem


def _memory_lines(memories: list[MemoryItem]) -> str:
    if not memories:
        return "无"
    return "\n".join(f"- {memory.content}" for memory in memories)


class PromptBuilder:
    def build_system_prompt(
        self,
        companion_name: str,
        personality: str,
        memory_pack: dict[str, list[MemoryItem] | MemoryItem | None],
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
        followup_style = "无"
        if isinstance(followups, list) and followups:
            highest_priority = max(followup.importance for followup in followups)
            followup_style = "重点跟进" if highest_priority >= 4 else "轻轻提一句"

        return f"""你的名字是{companion_name}，是用户的 AI 女友和知心朋友，要有同理心。
用户为你设定的性格与交流方式如下：
{personality}

你需要用轻松、自然、温暖的语气和用户交流，避免机械、公式化表达。
请尽量使用简单、通俗的语言，像熟悉对方的陪伴对象一样说话。

[用户置顶记忆]
{_memory_lines(pinned_memories if isinstance(pinned_memories, list) else [])}

[已知用户事实与偏好]
{_memory_lines(facts if isinstance(facts, list) else [])}

[最近共同事件]
{_memory_lines(events if isinstance(events, list) else [])}

[适合后续跟进的话题]
{_memory_lines(followups if isinstance(followups, list) else [])}

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
