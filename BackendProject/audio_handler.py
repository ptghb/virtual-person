import base64
import json
import numpy as np
from typing import Dict, List
import asyncio
from datetime import datetime

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
        if client_id in self.audio_buffers:
            del self.audio_buffers[client_id]
        print(f"[AudioProcessor] 停止处理客户端 {client_id} 的音频流")
        
    async def process_audio_chunk(self, client_id: str, audio_data: dict) -> Dict:
        try:
            if not self.is_recording.get(client_id, False):
                return {"status": "error", "message": "音频流未启动"}
            
            audio_chunk_base64 = audio_data.get("chunk", "")
            if not audio_chunk_base64:
                return {"status": "error", "message": "音频数据为空"}
                
            audio_bytes = base64.b64decode(audio_chunk_base64)
            if client_id not in self.audio_buffers:
                self.audio_buffers[client_id] = []
            
            self.audio_buffers[client_id].append(audio_bytes)
            
            is_final = audio_data.get("is_final", False)
            if is_final:
                await self._process_complete_audio(client_id)
            
            return {
                "status": "success",
                "message": f"接收到音频块，大小: {len(audio_bytes)} 字节",
                "is_final": is_final
            }
            
        except Exception as e:
            return {"status": "error", "message": f"音频处理失败: {str(e)}"}
    
    async def _process_complete_audio(self, client_id: str):
        if client_id not in self.audio_buffers or not self.audio_buffers[client_id]:
            return
        all_audio_data = b''.join(self.audio_buffers[client_id])
        print(f"[AudioProcessor] 处理完整音频，总大小: {len(all_audio_data)} 字节")
        self.audio_buffers[client_id] = []

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
                
            return msg_type, msg_data, ""
        except Exception as e:
            return "", {}, f"消息解析错误: {str(e)}"

audio_processor = AudioProcessor()
message_parser = MessageParser()