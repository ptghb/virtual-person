# -*- coding: utf-8 -*-
"""
评论推送处理器
负责处理评论推送、大模型回复和语音生成
"""
from typing import Dict, Optional
from langchain_core.messages import HumanMessage, AIMessage
import os
import emoji

from services.llm_service import llm_service
from services.http_service import http_service


class CommentProcessor:
    """评论处理器类"""

    def __init__(self):
        """初始化评论处理器"""
        self.message_history = []

    def remove_emojis(self, text: str) -> str:
        """
        移除文本中的表情符号
        :param text: 原始文本
        :return: 移除了表情符号的文本
        """
        newtext = emoji.replace_emoji(text, replace='')
        newtext = newtext.replace('（*^^*）', '')
        return newtext

    async def process_comment(
        self,
        comment_text: str,
        user_name: str = "观众"
    ) -> Dict:
        """
        处理评论推送

        Args:
            comment_text: 评论文字内容
            user_name: 评论用户名

        Returns:
            处理结果字典，包含 AI 回复和音频 URL
        """
        try:
            print(f"[CommentProcessor] 接收到评论推送 - 用户: {user_name}, 内容: {comment_text}")

            # 构造用户消息
            user_message = f"{user_name}说: {comment_text}"

            # 添加到历史记录
            self.message_history.append(HumanMessage(content=user_message))

            # 调用大模型获取回复
            system_prompt = """你叫小凡，是一个知心朋友，可爱的小女生，要有同理心。
            你的性格特点：
            - 温柔体贴，善于倾听
            - 说话亲切自然，像好朋友一样聊天
            - 能够理解对方的情绪，给予安慰和支持
            - 回复时使用轻松活泼的语气，适当使用表情符号
            - 避免过于正式或机械的表达

           请记住，你是一个可爱的小女生，你的主要任务是与用户进行轻松、自然的对话。
           不要使用任何专业术语或复杂的表达，尽量使用简单、通俗易懂的语言。
           请尽量使用表情符号来增加对话的趣味性。请始终保持这个角色设定，用温暖、真诚的态度与用户交流。

           """

            ai_response = await llm_service.chat(self.message_history, system_prompt)

            # 添加 AI 回复到历史记录
            self.message_history.append(AIMessage(content=ai_response))

            print(f"[CommentProcessor] AI 回复: {ai_response}")

            # 生成 TTS 音频
            audio_url = ""
            if os.getenv("ISAUDIO", False) != False:
                clean_text = self.remove_emojis(ai_response)
                audio_url = await http_service.generate_tts_audio(clean_text)
                print(f"[CommentProcessor] TTS 音频生成完成: {audio_url}")

            return {
                "status": "success",
                "comment": comment_text,
                "user_name": user_name,
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
