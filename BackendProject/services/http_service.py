# -*- coding: utf-8 -*-
"""
HTTP服务层
负责所有HTTP请求的逻辑
"""
import httpx
import os
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class HTTPService:
    """HTTP服务类"""

    def __init__(self):
        """初始化HTTP服务"""
        self.tts_api_url = os.getenv("TTS_API_URL", "http://localhost:3000")
        self.audio_url = os.getenv("AUDIO_URL", "http://localhost:3000")

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

    async def transcribe_audio(self, audio_filepath: str) -> Optional[str]:
        """
        语音识别

        Args:
            audio_filepath: 音频文件路径

        Returns:
            识别结果文本，失败返回None
        """
        api_key = os.getenv("SILICONFLOW_API_KEY")
        if not api_key:
            print("[HTTPService] 未找到SILICONFLOW_API_KEY环境变量")
            return None

        url = "https://api.siliconflow.cn/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {api_key}"
        }

        try:
            with open(audio_filepath, "rb") as audio_file:
                files = {
                    "file": (os.path.basename(audio_filepath), audio_file, "audio/wav"),
                    "model": (None, "FunAudioLLM/SenseVoiceSmall")
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
