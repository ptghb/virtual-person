#!/usr/bin/env python3
"""
快速测试脚本，验证WebSocket服务器对新协议格式的支持
"""

import asyncio
import websockets
import json
from datetime import datetime

async def quick_test():
    uri = "ws://localhost:8000/ws/test_client"
    
    # 测试数据格式（与前端一致）
    test_message = {
        "type": "text",
        "data": {
            "content": "下午好",
            "model": "Hiyori",
            "is_audio": False,
            "timestamp": datetime.now().isoformat(),
            "client_id": "user_1769846085948"
        }
    }
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 连接到WebSocket服务器")
            
            # 接收欢迎消息
            welcome = await websocket.recv()
            print(f"📥 欢迎消息: {welcome}")
            
            # 发送测试消息
            await websocket.send(json.dumps(test_message))
            print(f"📤 发送测试消息: {json.dumps(test_message, indent=2)}")
            
            # 等待响应
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                print(f"📥 收到响应: {response}")
                
                # 尝试解析响应
                try:
                    response_data = json.loads(response)
                    if response_data.get("type") == "response":
                        print("✅ 服务器正确识别了新协议格式")
                        print(f"📊 响应状态: {response_data['data']['status']}")
                        print(f"📝 响应消息: {response_data['data']['message']}")
                    else:
                        print("✅ 收到AI回复")
                        print(f"🤖 AI回复: {response}")
                except json.JSONDecodeError:
                    print(f"📝 服务器回复: {response}")
                    
            except asyncio.TimeoutError:
                print("⏰ 等待响应超时")
                
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    print("🧪 快速协议格式测试")
    print("=" * 40)
    asyncio.run(quick_test())