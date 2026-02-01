# -*- coding: utf-8 -*-
import asyncio
import websockets
import json
import base64
from PIL import Image
import io
import os

async def test_image_message():
    """测试图片消息功能"""
    uri = "ws://localhost:8000/ws/test_client_python"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 连接到WebSocket服务器")
            
            # 等待欢迎消息
            welcome_msg = await websocket.recv()
            print(f"📥 收到欢迎消息: {welcome_msg}")
            
            # 创建测试图片
            test_image_path = create_test_image()
            
            # 读取并编码图片
            with open(test_image_path, "rb") as image_file:
                image_data = image_file.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            print(f"📊 图片大小: {len(image_data)} 字节")
            print(f"🔤 Base64编码长度: {len(image_base64)} 字符")
            
            # 构造图片消息
            image_message = {
                "type": "image",
                "data": {
                    "image": image_base64,
                    "format": "png",
                    "timestamp": "2024-01-01T12:00:00Z",
                    "client_id": "test_client_python"
                }
            }
            
            # 发送图片消息
            print("📤 发送图片消息...")
            await websocket.send(json.dumps(image_message))
            
            # 等待响应
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print(f"📥 收到响应: {response}")
                
                # 解析响应
                response_data = json.loads(response)
                if response_data.get("type") == "response":
                    status = response_data["data"].get("status")
                    message = response_data["data"].get("message")
                    description = response_data["data"].get("description", "")
                    
                    print(f"📊 处理状态: {status}")
                    print(f"💬 处理消息: {message}")
                    if description:
                        print(f"📝 图片描述: {description}")
                        
            except asyncio.TimeoutError:
                print("⏰ 等待响应超时")
            
            # 等待可能的AI描述消息
            try:
                ai_description = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"🤖 AI描述消息: {ai_description}")
            except asyncio.TimeoutError:
                print("⏰ 未收到AI描述消息")
            
            print("✅ 测试完成")
            
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")

def create_test_image():
    """创建测试图片"""
    # 创建一个简单的测试图片
    img = Image.new('RGB', (200, 200), color='red')
    
    # 添加一些图形元素
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 150, 150], fill='blue')
    draw.ellipse([75, 75, 125, 125], fill='yellow')
    draw.text((85, 95), "Test", fill='black')
    
    # 保存图片
    test_image_path = "test_image.png"
    img.save(test_image_path, "PNG")
    print(f"🖼️  创建测试图片: {test_image_path}")
    
    return test_image_path

async def test_multiple_images():
    """测试多张图片"""
    print("\n🔄 开始多图片测试...")
    
    # 创建第二张测试图片
    img2 = Image.new('RGB', (150, 150), color='green')
    from PIL import ImageDraw
    draw2 = ImageDraw.Draw(img2)
    draw2.polygon([(75, 25), (125, 125), (25, 125)], fill='purple')
    test_image2_path = "test_image2.png"
    img2.save(test_image2_path, "PNG")
    
    uri = "ws://localhost:8000/ws/test_client_multi"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 连接到WebSocket服务器")
            
            # 等待欢迎消息
            await websocket.recv()
            
            # 发送第一张图片
            with open("test_image.png", "rb") as f:
                img1_data = base64.b64encode(f.read()).decode('utf-8')
            
            msg1 = {
                "type": "image",
                "data": {
                    "image": img1_data,
                    "format": "png",
                    "timestamp": "2024-01-01T12:01:00Z",
                    "client_id": "test_client_multi"
                }
            }
            
            print("📤 发送第一张图片...")
            await websocket.send(json.dumps(msg1))
            await asyncio.wait_for(websocket.recv(), timeout=30.0)
            
            # 发送第二张图片
            with open(test_image2_path, "rb") as f:
                img2_data = base64.b64encode(f.read()).decode('utf-8')
            
            msg2 = {
                "type": "image",
                "data": {
                    "image": img2_data,
                    "format": "png",
                    "timestamp": "2024-01-01T12:02:00Z",
                    "client_id": "test_client_multi"
                }
            }
            
            print("📤 发送第二张图片...")
            await websocket.send(json.dumps(msg2))
            await asyncio.wait_for(websocket.recv(), timeout=30.0)
            
            print("✅ 多图片测试完成")
            
    except Exception as e:
        print(f"❌ 多图片测试失败: {str(e)}")
    finally:
        # 清理测试文件
        for file_path in ["test_image.png", "test_image2.png"]:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️  删除测试文件: {file_path}")

if __name__ == "__main__":
    print("🚀 开始WebSocket图片消息测试")
    print("=" * 50)
    
    # 运行单图片测试
    asyncio.run(test_image_message())
    
    # 运行多图片测试
    asyncio.run(test_multiple_images())
    
    print("=" * 50)
    print("🏁 所有测试完成")