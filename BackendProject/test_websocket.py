#!/usr/bin/env python3
"""
WebSocket服务器测试脚本
测试音频和文本消息的处理功能
"""

import asyncio
import websockets
import json
import base64
import time
from datetime import datetime

async def test_websocket():
    uri = "ws://localhost:8000/ws/test_client"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 成功连接到WebSocket服务器")
            
            # 测试1: 接收欢迎消息
            welcome_msg = await websocket.recv()
            print(f"📥 收到欢迎消息: {welcome_msg}")
            
            # 测试2: 发送控制消息 - 开始音频流
            print("\n--- 测试音频流控制 ---")
            control_start = {
                "type": "control",
                "data": {
                    "action": "start_audio_stream",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "test_client"
                }
            }
            await websocket.send(json.dumps(control_start))
            response = await websocket.recv()
            print(f"📤 发送开始音频流命令")
            print(f"📥 收到响应: {response}")
            
            # 测试3: 发送音频数据
            print("\n--- 测试音频数据传输 ---")
            # 生成测试音频数据
            test_audio = base64.b64encode(b"test_audio_data_12345").decode('utf-8')
            
            audio_msg = {
                "type": "audio",
                "data": {
                    "format": "pcm",
                    "sample_rate": 16000,
                    "channels": 1,
                    "chunk": test_audio,
                    "is_final": False,
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "test_client"
                }
            }
            await websocket.send(json.dumps(audio_msg))
            response = await websocket.recv()
            print(f"📤 发送音频数据块")
            print(f"📥 收到响应: {response}")
            
            # 测试4: 发送文本消息
            print("\n--- 测试文本消息处理 ---")
            text_msg = {
                "type": "text",
                "data": {
                    "content": "你好，小凡！今天天气怎么样？",
                    "model": "Hiyori",
                    "is_audio": True,
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "test_client"
                }
            }
            await websocket.send(json.dumps(text_msg))
            print(f"📤 发送文本消息: 你好，小凡！今天天气怎么样？")
            
            # 等待AI回复
            try:
                ai_response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 收到AI回复: {ai_response}")
            except asyncio.TimeoutError:
                print("⏰ 等待AI回复超时")
            
            # 测试5: 发送控制消息 - 停止音频流
            print("\n--- 测试音频流结束 ---")
            control_stop = {
                "type": "control",
                "data": {
                    "action": "stop_audio_stream",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "test_client"
                }
            }
            await websocket.send(json.dumps(control_stop))
            response = await websocket.recv()
            print(f"📤 发送停止音频流命令")
            print(f"📥 收到响应: {response}")
            
            print("\n✅ 所有测试完成！")
            
    except websockets.exceptions.ConnectionClosed:
        print("❌ WebSocket连接意外关闭")
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")

async def performance_test():
    """性能测试：快速发送多个消息"""
    uri = "ws://localhost:8000/ws/performance_test"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("🚀 开始性能测试...")
            
            # 发送多个消息测试并发处理能力
            start_time = time.time()
            message_count = 10
            
            for i in range(message_count):
                text_msg = {
                    "type": "text",
                    "data": {
                        "content": f"测试消息 {i+1}",
                        "model": "Hiyori",
                        "is_audio": False,
                        "timestamp": datetime.now().isoformat(),
                        "client_id": "performance_test"
                    }
                }
                await websocket.send(json.dumps(text_msg))
                await websocket.recv()  # 等待响应
                
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"📊 性能测试结果:")
            print(f"   - 处理消息数量: {message_count}")
            print(f"   - 总耗时: {duration:.2f}秒")
            print(f"   - 平均响应时间: {(duration/message_count)*1000:.2f}毫秒")
            
    except Exception as e:
        print(f"❌ 性能测试失败: {e}")

if __name__ == "__main__":
    print("🧪 WebSocket服务器功能测试")
    print("=" * 50)
    
    # 运行基础功能测试
    asyncio.run(test_websocket())
    
    print("\n" + "=" * 50)
    print("⚡ 性能测试")
    print("=" * 50)
    
    # 运行性能测试
    asyncio.run(performance_test())