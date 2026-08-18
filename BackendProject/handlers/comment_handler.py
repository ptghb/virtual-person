# -*- coding: utf-8 -*-
"""
评论推送处理器
负责处理评论推送、大模型回复和语音生成
"""
from typing import Dict, Optional
from langchain_core.messages import HumanMessage, AIMessage
import os
import emoji
import re

from services.llm_service import llm_service
from services.http_service import http_service


class CommentProcessor:
    """评论处理器类"""

    def __init__(self):
        """初始化评论处理器"""
        self.message_history = []

    def normalize_tts_text(self, text: str) -> str:
        """清理只用于语音合成的表情注释与特殊语气符号。"""
        clean_text = text
        bracket_patterns = (
            r"（[^（）]*）",
            r"\([^()]*\)",
            r"【[^【】]*】",
            r"\[[^\[\]]*\]",
            r"\{[^{}]*\}",
        )
        previous_text = None
        while clean_text != previous_text:
            previous_text = clean_text
            for pattern in bracket_patterns:
                clean_text = re.sub(pattern, "", clean_text)

        clean_text = emoji.replace_emoji(clean_text, replace='')
        clean_text = re.sub(r"[~～]+", "。", clean_text)
        return re.sub(r"[ \t]+", " ", clean_text).strip()

    async def process_comment(
        self,
        chat_messages_str: str = "",
        companion_name: str = "小凡",
        personality: str = "",
    ) -> Dict:
        """
        处理评论推送

        Args:
            comment_text: 评论文字内容
            user_name: 评论用户名
            chat_messages_str: 批量评论消息字符串（格式：说话人：说话内容）

        Returns:
            处理结果字典，包含 AI 回复和音频 URL
        """
        try:
            if chat_messages_str:
                print(f"[CommentProcessor] 批量评论消息:\n{chat_messages_str}")

            # 构造用户消息，包含批量评论上下文
            if chat_messages_str:
                user_message = f"以下是当前直播间的评论消息:\n{chat_messages_str}\n\n请回复评论:"

                # 添加到历史记录
                self.message_history.append(HumanMessage(content=user_message))

            # 调用大模型获取回复
            system_prompt = f"""你的名字是{companion_name}，是一个知心主播和用户的 AI 女友，要有同理心。
            你正在直播，有人在评论区留言，你需要用温暖、真诚的态度回复他。
            用户为你设定的性格与交流方式如下：
            {personality}
            你的回答规则：
            - 避免过于正式或机械的表达
            - 回答不要太正式
            - 回答不要太长，尽量简短
            - 不要包含任何敏感信息或不良内容
            - 不要包含任何个人隐私或联系方式
            - 不要包含任何广告或推销内容
            - 不要包含任何违反法律法规的内容
            - 不要包含任何可能引起争议或不适的内容
            - 不要包含任何涉及政治、宗教、种族、性别、性取向、年龄等方面的内容
            - 不要包含任何涉及商业、营销、推广等方面的内容
            - 不要包含任何涉及个人隐私、健康、安全等方面的内容
            - 不要包含任何涉及法律、法规、政策等方面的内容
            - 不要包含任何涉及健康、安全、隐私等方面的内容

           请记住，你的主要任务是与用户和观众进行轻松、自然的对话。
           不要使用任何专业术语或复杂的表达，尽量使用简单、通俗易懂的语言。
           请始终保持这个角色设定，用温暖、真诚的态度与用户交流。

           """

            ai_response = await llm_service.chat(self.message_history, system_prompt)

            # 添加 AI 回复到历史记录
            self.message_history.append(AIMessage(content=ai_response))

            print(f"[CommentProcessor] AI 回复: {ai_response}")

            # 生成 TTS 音频
            audio_url = ""
            if os.getenv("ISAUDIO", False) != False:
                clean_text = self.normalize_tts_text(ai_response)
                audio_url = await http_service.generate_tts_audio(clean_text)
                print(f"[CommentProcessor] TTS 音频生成完成: {audio_url}")

            return {
                "status": "success",
                "comment": chat_messages_str,
                "user_name": "",
                "ai_response": ai_response,
                "audio_url": audio_url
            }

        except Exception as e:
            print(f"[CommentProcessor] 处理评论失败: {str(e)}")
            return {
                "status": "error",
                "message": f"处理评论失败: {str(e)}"
            }

    def clear_history(self):
        """清空历史记录"""
        self.message_history = []
        print("[CommentProcessor] 历史记录已清空")


# 创建全局实例
comment_processor = CommentProcessor()
