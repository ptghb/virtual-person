# -*- coding: utf-8 -*-
"""
HTTP服务层
负责所有HTTP请求的逻辑
"""
import httpx
import os
import mimetypes
from typing import AsyncIterator, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class HTTPService:
    """HTTP服务类"""

    def __init__(self):
        """初始化HTTP服务"""
        self.tts_api_url = os.getenv("TTS_API_URL", "http://localhost:3000")
        self.audio_url = os.getenv("AUDIO_URL", "http://localhost:3000")
        # ASR 独立配置，避免和对话生成模型共用 OPENAI_BASE_URL。
        # 兼容旧配置：未配置 ASR_* 时仍使用 SiliconFlow 默认地址和 SILICONFLOW_* 变量。
        self.asr_base_url = (
            os.getenv("ASR_BASE_URL")
            or os.getenv("SILICONFLOW_ASR_BASE_URL")
            or "https://api.siliconflow.cn/v1"
        ).rstrip("/")
        self.asr_api_key = os.getenv("ASR_API_KEY") or os.getenv("SILICONFLOW_API_KEY")
        self.asr_model = (
            os.getenv("ASR_MODEL")
            or os.getenv("SILICONFLOW_ASR_MODEL")
            or "XingChenAGI/XingChenASR-V3.2"
        )

    async def post(
        self,
        url: str,
        json_data: Dict = None,
        headers: Dict = None,
        timeout: float = 30.0
    ) -> Optional[Dict]:
        """
        发送POST请求

        Args:
            url: 请求URL
            json_data: JSON数据
            headers: 请求头
            timeout: 超时时间

        Returns:
            响应JSON数据
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=json_data,
                    headers=headers,
                    timeout=timeout
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"[HTTPService] POST请求失败: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"[HTTPService] POST请求异常: {str(e)}")
            return None

    async def post_with_files(
        self,
        url: str,
        files: Dict,
        headers: Dict = None,
        timeout: float = 30.0
    ) -> Optional[Dict]:
        """
        发送带文件的POST请求

        Args:
            url: 请求URL
            files: 文件数据
            headers: 请求头
            timeout: 超时时间

        Returns:
            响应JSON数据
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    files=files,
                    timeout=timeout
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"[HTTPService] POST请求失败: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"[HTTPService] POST请求异常: {str(e)}")
            return None

    async def generate_tts_audio(self, text: str) -> Optional[str]:
        """
        生成TTS音频

        Args:
            text: 要转换的文本

        Returns:
            音频URL，失败返回None
        """
        try:
            response = await self.post(
                f"{self.tts_api_url}/api/v1/tts/generate",
                json_data={
                    "text": text,
                    "voice": "zh-CN-XiaoxiaoNeural",
                    "rate": "0%",
                    "pitch": "0Hz",
                    "volume": "0%"
                },
                timeout=30.0
            )

            if response and response.get("success"):
                audio_file = response["data"]["audio"]
                return f"{self.audio_url}{audio_file}"

            return None
        except Exception as e:
            print(f"[HTTPService] TTS音频生成失败: {str(e)}")
            return None

    async def stream_tts_audio(self, text: str) -> AsyncIterator[bytes]:
        """代理 EasyVoice 流式音频响应。"""
        payload = {
            "text": text,
            "voice": "zh-CN-XiaoxiaoNeural",
            "rate": "0%",
            "pitch": "0Hz",
            "volume": "0%",
            "useLLM": False,
        }
        timeout = httpx.Timeout(60.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{self.tts_api_url}/api/v1/tts/createStream",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk

    async def transcribe_audio(self, audio_filepath: str) -> Optional[str]:
        """
        语音识别

        Args:
            audio_filepath: 音频文件路径

        Returns:
            识别结果文本，失败返回None
        """
        if not self.asr_api_key:
            print("[HTTPService] 未找到 ASR_API_KEY 或 SILICONFLOW_API_KEY 环境变量")
            return None

        url = f"{self.asr_base_url}/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {self.asr_api_key}"
        }

        try:
            with open(audio_filepath, "rb") as audio_file:
                files = {
                    "file": (
                        os.path.basename(audio_filepath),
                        audio_file,
                        mimetypes.guess_type(audio_filepath)[0]
                        or "application/octet-stream",
                    ),
                    "model": (
                        None,
                        self.asr_model,
                    )
                }

                response = await self.post_with_files(
                    url,
                    files=files,
                    headers=headers,
                    timeout=30.0
                )

                if response:
                    transcription = response.get("text", "")
                    print(f"[HTTPService] 语音识别结果: {transcription}")
                    return transcription

                return None
        except Exception as e:
            print(f"[HTTPService] 语音识别过程出错: {str(e)}")
            return None


# 创建全局实例
http_service = HTTPService()
