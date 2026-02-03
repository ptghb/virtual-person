# -*- coding: utf-8 -*-
"""
大模型服务层
负责所有与大模型交互的逻辑
"""
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, SystemMessage
import os
import base64
from dotenv import load_dotenv
from zhipuai import ZhipuAI

load_dotenv()


class LLMService:
    """大模型服务类"""

    def __init__(self):
        """初始化大模型客户端"""
        self.llm = ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        self.zhipu_client = None
        self._initialize_zhipu_client()

    def _initialize_zhipu_client(self):
        """初始化智谱AI客户端"""
        api_key = os.getenv("ZHIPUAI_API_KEY")
        if api_key and api_key != "your_zhipuai_api_key_here":
            try:
                self.zhipu_client = ZhipuAI(api_key=api_key)
                print("[LLMService] 智谱AI客户端初始化成功")
            except Exception as e:
                print(f"[LLMService] 智谱AI客户端初始化失败: {str(e)}")
                self.zhipu_client = None
        else:
            print("[LLMService] 未配置ZHIPUAI_API_KEY或使用默认值")

    async def chat(
        self,
        messages: List[BaseMessage],
        system_prompt: str = None
    ) -> str:
        """
        调用大模型进行对话

        Args:
            messages: 消息列表
            system_prompt: 系统提示词（可选）

        Returns:
            模型回复内容
        """
        try:
            # 如果提供了系统提示词，添加到消息列表开头
            if system_prompt:
                final_messages = [SystemMessage(content=system_prompt)] + messages
            else:
                final_messages = messages

            response = await self.llm.ainvoke(final_messages)
            return response.content
        except Exception as e:
            print(f"[LLMService] 大模型调用失败: {str(e)}")
            raise

    async def analyze_image(self, image_bytes: bytes, prompt: str = None) -> str:
        """
        使用智谱AI GLM-4V-Flash模型分析图片

        Args:
            image_bytes: 图片字节数据
            prompt: 分析提示词（可选）

        Returns:
            图片分析结果描述
        """
        if not self.zhipu_client:
            raise Exception("智谱AI客户端未初始化")

        if not prompt:
            prompt = "描述一下我的表情，心情，穿着，动作，背景，以及我所处的环境，我正在做什么。回答主语要用我。"

        try:
            # 将图片转换为base64格式
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

            # 调用智谱AI的GLM-4V-Flash模型
            response = self.zhipu_client.chat.completions.create(
                model="glm-4.6v-flash",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                stream=False,
            )

            # 提取分析结果
            if hasattr(response, 'choices') and len(response.choices) > 0:
                description = response.choices[0].message.content
                print(f"[LLMService] GLM-4V-Flash分析完成")
                return description
            else:
                raise Exception("模型返回结果格式异常")

        except Exception as e:
            error_msg = f"GLM-4V-Flash调用失败: {str(e)}"
            print(f"[LLMService] {error_msg}")
            raise

    async def get_animation_index(
        self,
        messages: List[BaseMessage],
        model_name: str
    ) -> int:
        """
        根据对话内容获取动画索引

        Args:
            messages: 消息列表
            model_name: Live2D模型名称

        Returns:
            动画索引
        """
        system_prompt = f"""根据聊天内容的气氛来选择使用哪种live2d的动画。
           现在的live2d的模型名称是 {model_name}
           - 如果聊天氛围轻松愉快
             - 如果是Hiyori，可以使用1,2
             - 如果是Haru，可以使用1,2
             - 如果是Mark，可以使用3,4
             - 如果Natori，可以使用5,6
             - 如果Rice，可以使用2
             - 如果Mao，可以使用4
             - 如果Wanko，可以使用1
           - 如果对话氛围比较严肃
             - 如果是Hiyori，可以使用3
             - 如果是Haru，可以使用1，2
             - 如果是Mark，可以使用3，4
             - 如果Natori，可以使用5，6
             - 如果Rice，可以使用3
             - 如果Mao，可以使用3
             - 如果Wanko，可以使用3
           - 如果对话氛围比较悲伤
             - 如果是Hiyori，可以使用7，8
             - 如果是Haru，可以使用1，2
             - 如果是Mark，可以使用3，4
             - 如果Natori，可以使用5，6
             - 如果Rice，可以使用1
             - 如果Mao，可以使用2
             - 如果Wanko，可以使用2
           输出数字作为结果，不要输出其他任何内容，不要输出文字，不要输出表情符号。
           """

        try:
            final_messages = [SystemMessage(content=system_prompt)] + messages
            response = await self.llm.ainvoke(final_messages)
            animation_index = response.content.strip()
            return int(animation_index)
        except Exception as e:
            print(f"[LLMService] 获取动画索引失败: {str(e)}")
            return 1  # 默认返回1

    async def should_take_photo(
        self,
        messages: List[BaseMessage]
    ) -> bool:
        """
        根据对话内容判断是否需要拍照

        Args:
            messages: 消息列表

        Returns:
            是否需要拍照（True/False）
        """
        system_prompt = """你是一个智能助手，需要根据对话内容判断是否需要拍照。

判断标准：
- 如果用户提到脸色不好看、皮肤不好看、妆容不好看、妆容不对、发型不好看、发型不对等关键词，返回 true
- 如果用户提到你看看我、看看我的脸、看看我的妆容、看看我的发型等关键词，返回 true
- 如果用户提到化妆、打底妆、打粉底、打口红、画眉毛、染发、染指甲等关键词，返回 true
- 如果用户提到美颜、滤镜、特效等关键词，返回 true
- 如果用户提到拍照、照片、合影、自拍、留念、记录等关键词，返回 true
- 如果用户想要记录当前场景、保存美好时刻、留下回忆等，返回 true
- 如果用户询问是否可以拍照、能否拍照等，返回 true
- 如果用户提到相机、镜头、拍摄等与拍照相关的词汇，返回 true
- 其他情况返回 false

请只返回 true 或 false，不要输出其他任何内容，不要输出文字解释，不要输出表情符号。
"""

        try:
            final_messages = [SystemMessage(content=system_prompt)] + messages
            print(f"[LLMService] 拍照判断请求: {final_messages}")
            response = await self.llm.ainvoke(final_messages)
            result = response.content.strip().lower()
            print(f"[LLMService] 拍照判断结果: {result}")
            return result == "true"
        except Exception as e:
            print(f"[LLMService] 拍照判断失败: {str(e)}")
            return False  # 默认返回 false


# 创建全局实例
llm_service = LLMService()
