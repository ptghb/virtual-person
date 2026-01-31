#!/usr/bin/env python3
"""
音频处理完成测试脚本
专门测试音频流结束时的完整处理逻辑
"""

import asyncio
import websockets
import json
import base64
from datetime import datetime

async def test_audio_completion():
    uri = "ws://localhost:8000/ws/audio_test_client"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 成功连接到WebSocket服务器")
            
            # 接收欢迎消息
            welcome_msg = await websocket.recv()
            print(f"📥 收到欢迎消息: {welcome_msg}")
            
            # 1. 开始音频流
            print("\n--- 步骤1: 开始音频流 ---")
            control_start = {
                "type": "control",
                "data": {
                    "action": "start_audio_stream",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "audio_test_client"
                }
            }
            await websocket.send(json.dumps(control_start))
            response = await websocket.recv()
            print(f"📥 收到响应: {response}")
            
            # 2. 发送几个音频数据块（is_final=False）
            print("\n--- 步骤2: 发送音频数据块 ---")
            test_audio_chunks = [
                base64.b64encode(b"audio_data_chunk_1").decode('utf-8'),
                base64.b64encode(b"audio_data_chunk_2").decode('utf-8'),
                base64.b64encode(b"audio_data_chunk_3").decode('utf-8')
            ]
            
            for i, chunk in enumerate(test_audio_chunks[:-1]):  # 除了最后一个
                audio_msg = {
                    "type": "audio",
                    "data": {
                        "format": "pcm",
                        "sample_rate": 16000,
                        "channels": 1,
                        "chunk": chunk,
                        "is_final": False,  # 关键：不是最终块
                        "timestamp": datetime.now().isoformat(),
                        "client_id": "audio_test_client"
                    }
                }
                await websocket.send(json.dumps(audio_msg))
                response = await websocket.recv()
                print(f"📥 第{i+1}个音频块响应: {response}")
            
            # 3. 发送最后一个音频块（is_final=True）- 这会触发完整音频处理
            print("\n--- 步骤3: 发送最终音频块（触发完整处理）---")
            final_audio_msg = {
                "type": "audio",
                "data": {
                    "format": "pcm",
                    "sample_rate": 16000,
                    "channels": 1,
                    "chunk": test_audio_chunks[-1],
                    "is_final": True,  # 关键：这是最终块
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "audio_test_client"
                }
            }
            await websocket.send(json.dumps(final_audio_msg))
            response = await websocket.recv()
            print(f"📥 最终音频块响应: {response}")
            
            # 4. 停止音频流
            print("\n--- 步骤4: 停止音频流 ---")
            control_stop = {
                "type": "control",
                "data": {
                    "action": "stop_audio_stream",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "audio_test_client"
                }
            }
            await websocket.send(json.dumps(control_stop))
            response = await websocket.recv()
            print(f"📥 停止响应: {response}")
            
            print("\n✅ 音频处理完成测试结束！")
            print("🔍 请检查服务器控制台是否有 '[AudioProcessor] 处理完整音频，总大小: X 字节' 的日志输出")
            
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")

if __name__ == "__main__":
    print("🧪 音频处理完成功能测试")
    print("=" * 50)
    print("此测试会验证当 is_final=True 时，音频处理器是否正确执行完整音频处理")
    print("=" * 50)
    
    asyncio.run(test_audio_completion())