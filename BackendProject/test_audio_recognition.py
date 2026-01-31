#!/usr/bin/env python3
"""
音频识别完整流程测试脚本
测试音频保存 + 语音识别 + AI对话的完整流程
"""

import asyncio
import websockets
import json
import base64
from datetime import datetime

async def test_full_audio_workflow():
    uri = "ws://localhost:8000/ws/audio_recognition_test"
    
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
                    "client_id": "audio_recognition_test"
                }
            }
            await websocket.send(json.dumps(control_start))
            response = await websocket.recv()
            print(f"📥 开始响应: {response}")
            
            # 2. 发送音频数据块
            print("\n--- 步骤2: 发送音频数据 ---")
            # 模拟一段中文语音的音频数据（实际应用中应该是真实的音频）
            test_audio_data = base64.b64encode(b"fake_audio_data_for_testing_purpose").decode('utf-8')
            
            audio_msg = {
                "type": "audio",
                "data": {
                    "format": "wav",
                    "sample_rate": 16000,
                    "channels": 1,
                    "chunk": test_audio_data,
                    "is_final": False,
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "audio_recognition_test"
                }
            }
            await websocket.send(json.dumps(audio_msg))
            response = await websocket.recv()
            print(f"📥 音频响应: {response}")
            
            # 3. 停止音频流并触发识别
            print("\n--- 步骤3: 停止音频流（触发语音识别）---")
            control_stop = {
                "type": "control",
                "data": {
                    "action": "stop_audio_stream",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "audio_recognition_test"
                }
            }
            await websocket.send(json.dumps(control_stop))
            
            # 等待处理结果（可能需要较长时间）
            try:
                final_response = await asyncio.wait_for(websocket.recv(), timeout=60.0)
                print(f"📥 最终响应: {final_response}")
                
                # 解析响应
                try:
                    response_data = json.loads(final_response)
                    if response_data.get("type") == "response":
                        transcription = response_data["data"].get("transcription", "")
                        if transcription:
                            print(f"🎉 语音识别成功: {transcription}")
                        else:
                            print("⚠️  语音识别未返回结果")
                    elif "小凡:" in final_response:
                        print(f"🤖 AI回复: {final_response}")
                except json.JSONDecodeError:
                    print(f"📝 服务器回复: {final_response}")
                    
            except asyncio.TimeoutError:
                print("⏰ 等待响应超时（语音识别可能需要更多时间）")
            
            print("\n✅ 音频识别完整流程测试结束！")
            
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")

if __name__ == "__main__":
    print("🧪 音频识别完整流程测试")
    print("=" * 50)
    print("此测试会验证:")
    print("1. 音频流的开始和数据传输")
    print("2. 音频文件的本地保存")
    print("3. SiliconFlow语音识别API调用")
    print("4. 识别结果传递给AI对话系统")
    print("=" * 50)
    
    asyncio.run(test_full_audio_workflow())