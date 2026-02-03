import base64
import json
from typing import Dict, List
from datetime import datetime
import os
import aiofiles
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class AudioProcessor:
    def __init__(self):
        self.audio_buffers: Dict[str, List[bytes]] = {}
        self.is_recording: Dict[str, bool] = {}

    def start_audio_stream(self, client_id: str):
        self.audio_buffers[client_id] = []
        self.is_recording[client_id] = True
        print(f"[AudioProcessor] 开始处理客户端 {client_id} 的音频流")

    def stop_audio_stream(self, client_id: str):
        self.is_recording[client_id] = False
        print(f"[AudioProcessor] 停止处理客户端 {client_id} 的音频流")
        # 缓冲区会在_process_complete_audio中清理

    async def process_audio_chunk(self, client_id: str, audio_data: dict) -> Dict:
        try:
            if not self.is_recording.get(client_id, False):
                return {"status": "error", "message": "音频流未启动"}

            audio_chunk_base64 = audio_data.get("chunk", "")
            is_final = audio_data.get("is_final", False)
            print(f"is_final: {is_final}")
            if not audio_chunk_base64:
                return {"status": "error", "message": "音频数据为空"}

            audio_bytes = base64.b64decode(audio_chunk_base64)
            if client_id not in self.audio_buffers:
                self.audio_buffers[client_id] = []

            self.audio_buffers[client_id].append(audio_bytes)

            # 不再在收到final块时立即处理，而是在流停止时统一处理

            return {
                "status": "success",
                "message": f"接收到音频块，大小: {len(audio_bytes)} 字节",
                "is_final": is_final
            }

        except Exception as e:
            return {"status": "error", "message": f"音频处理失败: {str(e)}"}

    async def _process_complete_audio(self, client_id: str):
        print("[AudioProcessor] 处理完整音频")
        if client_id not in self.audio_buffers or not self.audio_buffers[client_id]:
            return
        all_audio_data = b''.join(self.audio_buffers[client_id])

        print(f"[AudioProcessor] 处理完整音频，总大小: {len(all_audio_data)} 字节")

        # 保存音频到本地
        audio_filename = await self._save_audio_file(client_id, all_audio_data)

        # 调用语音识别API
        transcription = await self._transcribe_audio(audio_filename)

        # 清理缓冲区
        self.audio_buffers[client_id] = []

        return transcription

    async def _save_audio_file(self, client_id: str, audio_data: bytes) -> str:
        """保存音频数据到本地文件"""
        # 创建音频目录
        audio_dir = "audio_files"
        if not os.path.exists(audio_dir):
            os.makedirs(audio_dir)

        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{audio_dir}/audio_{client_id}_{timestamp}.wav"

        # 保存文件
        async with aiofiles.open(filename, "wb") as f:
            await f.write(audio_data)

        print(f"[AudioProcessor] 音频已保存到: {filename}")
        return filename

    async def _transcribe_audio(self, audio_filepath: str) -> str:
        """调用SiliconFlow语音识别API"""
        from services.http_service import http_service

        transcription = await http_service.transcribe_audio(audio_filepath)
        return transcription if transcription else ""

class MessageParser:
    @staticmethod
    def parse_message(raw_data: str) -> tuple[str, dict, str]:
        try:
            message_obj = json.loads(raw_data)
            msg_type = message_obj.get("type", "")
            msg_data = message_obj.get("data", {})

            if msg_type == "text" and "content" not in msg_data:
                return "", {}, "文本消息缺少content字段"
            elif msg_type == "audio" and "chunk" not in msg_data:
                return "", {}, "音频消息缺少chunk字段"
            elif msg_type == "control" and "action" not in msg_data:
                return "", {}, "控制消息缺少action字段"
            elif msg_type == "image" and "image" not in msg_data:
                return "", {}, "图片消息缺少image字段"

            return msg_type, msg_data, ""
        except Exception as e:
            return "", {}, f"消息解析错误: {str(e)}"

audio_processor = AudioProcessor()
message_parser = MessageParser()
