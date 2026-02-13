# -*- coding: utf-8 -*-
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
import os
import json
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
import emoji

from handlers.audio_handler import audio_processor, message_parser
from handlers.image_handler import image_processor
from handlers.comment_handler import comment_processor
from services.llm_service import llm_service
from services.http_service import http_service

# 加载环境变量
load_dotenv()

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # 存储 client_id 到 WebSocket 的映射
        self.client_connections: Dict[str, WebSocket] = {}
        # 存储每个客户端的消息历史记录
        self.message_history: Dict[str, List[BaseMessage]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_connections[client_id] = websocket
        print(f"[ConnectionManager] 客户端 {client_id} 已连接")

    def disconnect(self, websocket: WebSocket, client_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if client_id in self.client_connections:
            del self.client_connections[client_id]
        print(f"[ConnectionManager] 客户端 {client_id} 已断开")

    async def send_personal_message(self, message: str, audio: str, websocket: WebSocket, msg_type: int = 1, animation_index: int = None, should_take_photo: bool = None, prompt: str = None):
        """发送个人消息，支持多种类型

        Args:
            message: 消息内容（文字或URL）
            websocket: WebSocket连接
            msg_type: 消息类型（1:文字，2:图片，3:音频）
            animation_index: 动画序号（可选）
            should_take_photo: 是否需要拍照（可选）
        """
        message_obj = {
            "type": msg_type,
            "content": message,
            "audio": audio
        }

        if animation_index is not None:
            message_obj["animation_index"] = animation_index
        if should_take_photo is not None:
            message_obj["should_take_photo"] = should_take_photo
        if prompt is not None:
            message_obj["prompt"] = prompt
        print(f"[send_personal_message] 发送的消息内容: {message_obj}")

        await websocket.send_text(json.dumps(message_obj))

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    def add_message_to_history(self, client_id: str, message: BaseMessage):
        """添加消息到指定客户端的历史记录"""
        if client_id not in self.message_history:
            self.message_history[client_id] = []
        self.message_history[client_id].append(message)

    def get_message_history(self, client_id: str) -> List[BaseMessage]:
        """获取指定客户端的消息历史记录"""
        return self.message_history.get(client_id, [])

    def clear_message_history(self, client_id: str):
        """清除指定客户端的消息历史记录"""
        if client_id in self.message_history:
            del self.message_history[client_id]

    def get_client_by_id(self, client_id: str) -> Optional[WebSocket]:
        """根据 client_id 获取 WebSocket 连接"""
        return self.client_connections.get(client_id)


def remove_emojis(text: str) -> str:
    """
    移除文本中的表情符号
    :param text: 原始文本
    :return: 移除了表情符号的文本
    """
    """使用 emoji 库移除表情符号"""
    newtext = emoji.replace_emoji(text, replace='')
    newtext = newtext.replace('（*^^*）','')
    return newtext

manager = ConnectionManager()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        # 发送欢迎消息
        await manager.send_personal_message("你好，我是你的好朋友，小凡...", "", websocket, msg_type=1)

        while True:
            data = await websocket.receive_text()

            try:
                print(f"[websocket_endpoint] 接收到原始数据: {data}")

                # 先尝试解析为 JSON
                try:
                    parsed_data = json.loads(data)
                except json.JSONDecodeError:
                    await manager.send_personal_message("消息格式错误，请发送 JSON 格式的消息", "", websocket, msg_type=1)
                    continue

                # 判断消息格式类型
                # 格式1: 评论推送格式 [{"method": "WebcastChatMessage", ...}, ...] - 直接数组
                # 格式2: 标准格式 {"type": "xxx", "data": {...}} - 使用 MessageParser 解析
                if isinstance(parsed_data, list):
                    # 评论推送格式，直接是数组
                    msg_type = "comment"
                    msg_data = {"comments": parsed_data}
                    error = None
                    print(f"[websocket_endpoint] 识别为评论推送格式（数组）")
                else:
                    # 标准格式，使用 MessageParser 解析
                    msg_type, msg_data, error = message_parser.parse_message(data)

                    if error:
                        print(f"[websocket_endpoint] 消息解析错误: {error}")
                        await manager.send_personal_message(f"消息格式错误: {error}", "", websocket, msg_type=1)
                        continue

                print(f"[websocket_endpoint] 接收到消息类型: {msg_type}")
                print(f"[websocket_endpoint] 消息数据: {msg_data}")

                # 处理不同类型的消息
                if msg_type == "control":
                    await handle_control_message(websocket, client_id, msg_data)
                    continue
                elif msg_type == "audio":
                    await handle_audio_message(websocket, client_id, msg_data)
                    continue
                elif msg_type == "text":
                    await handle_text_message(websocket, client_id, msg_data)
                    continue
                elif msg_type == "image":
                    await handle_image_message(websocket, client_id, msg_data)
                    continue
                elif msg_type == "comment":
                    await handle_comment_message(websocket, client_id, msg_data)
                    continue

            except json.JSONDecodeError:
                await manager.send_personal_message("消息格式错误，请发送 JSON 格式的消息", "", websocket, msg_type=1)
            except Exception as e:
                await manager.send_personal_message(f"AI 错误: {str(e)}", "", websocket, msg_type=1)

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        await manager.broadcast(f"Client {client_id} left the chat")

# 新增的处理函数
async def handle_control_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理控制消息"""
    action = msg_data.get("action", "")
    print(f"[handle_control_message] 接收到控制消息，客户端: {client_id}, 动作: {action}")

    if action == "start_audio_stream":
        audio_processor.start_audio_stream(client_id)
        response = {
            "type": "response",
            "data": {
                "status": "success",
                "message": "音频流已启动",
                "request_type": "control"
            }
        }
        print(f"[handle_control_message] 发送响应: {response}")
        await websocket.send_text(json.dumps(response))

    elif action == "stop_audio_stream":
        # 先处理完整音频，获取识别结果
        transcription = await audio_processor._process_complete_audio(client_id)
        await websocket.send_text(transcription)

        audio_processor.stop_audio_stream(client_id)

        # 如果有识别结果，将其传递给AI对话系统
        if transcription:
            # 构造文本消息并处理
            text_msg_data = {
                "content": transcription,
                "model": "Hiyori",
                "is_audio": True
            }
            await handle_text_message(websocket, client_id, text_msg_data)

        response = {
            "type": "response",
            "data": {
                "status": "success",
                "message": f"音频流已停止，识别结果: {transcription}",
                "request_type": "control",
                "transcription": transcription
            }
        }
        print(f"[handle_control_message] 发送响应: {response}")
        await websocket.send_text(json.dumps(response))

    else:
        response = {
            "type": "response",
            "data": {
                "status": "error",
                "message": f"未知的控制动作: {action}",
                "request_type": "control"
            }
        }
        print(f"[handle_control_message] 发送错误响应: {response}")
        await websocket.send_text(json.dumps(response))

async def handle_audio_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理音频消息"""
    print(f"[handle_audio_message] 接收到音频消息，客户端: {client_id}")
    print(f"[handle_audio_message] 消息数据: {msg_data}")

    result = await audio_processor.process_audio_chunk(client_id, msg_data)

    response = {
        "type": "response",
        "data": {
            "status": result["status"],
            "message": result["message"],
            "request_type": "audio",
            "is_final": result.get("is_final", False)
        }
    }
    print(f"[handle_audio_message] 发送响应: {response}")

async def handle_image_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理图片消息"""
    print(f"[handle_image_message] 接收到图片消息，客户端: {client_id}")
    print(f"[handle_image_message] 消息数据长度: {len(msg_data.get('image', '')) if 'image' in msg_data else 0} 字符")
    is_audio = msg_data.get("is_audio", False)
    print(f"[handle_image_message] 是否音频消息: {is_audio}")

    # 处理图片消息
    result = await image_processor.process_image_message(msg_data)

    # 同时发送AI对图片的描述作为聊天消息
    if result["status"] == "success" and "description" in result:
        ai_response = result["description"]
        # await manager.send_personal_message(f"图片分析结果: {description}", "", websocket, msg_type=1)

        humanMessage = msg_data.get("prompt", None) if msg_data.get("prompt", None) else "拍照"
        # 将用户消息和AI回复添加到历史记录
        manager.add_message_to_history(client_id, HumanMessage(content=humanMessage))
        manager.add_message_to_history(client_id, AIMessage(content=ai_response))

        # TTS处理
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False and is_audio:
          clean_text = remove_emojis(ai_response)
          audio_url = await http_service.generate_tts_audio(clean_text)

        # 发送 AI 回复
        await manager.send_personal_message(
          f"小凡: {ai_response}",
          audio_url,
          websocket,
          msg_type=1,
          animation_index=0,
          should_take_photo=False,
          prompt=None
        )

async def handle_comment_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理评论推送消息

    消息格式:
    {
        "type": "comment",
        "comments": [
            {
                "id": "消息ID",
                "method": "WebcastChatMessage|WebcastMemberMessage|WebcastGiftMessage|WebcastLikeMessage",
                "user": {
                    "id": "用户ID",
                    "name": "用户名",
                    "avatar": "头像URL"
                },
                "content": "评论内容（仅 WebcastChatMessage 有）",
                "gift": {...},  // 仅 WebcastGiftMessage 有
                "room": {...}   // 房间信息
            },
            ...
        ]
    }

    处理流程:
    1. 接收评论推送数组
    2. 过滤出 WebcastChatMessage 类型的消息（实际评论）
    3. 调用大模型生成回复
    4. 生成 TTS 语音
    5. 发送给所有 livestream_user_ 开头的客户端
    """
    print(f"[handle_comment_message] 接收到评论推送消息，客户端: {client_id}")

    comments = msg_data.get("comments", [])

    if not comments:
        response = {
            "type": "response",
            "data": {
                "status": "error",
                "message": "评论数据不能为空",
                "request_type": "comment"
            }
        }
        await websocket.send_text(json.dumps(response))
        return

    # 过滤出 WebcastChatMessage 类型的消息（实际评论）
    chat_messages = [
        msg for msg in comments
        if msg.get("method") == "WebcastChatMessage" and msg.get("content")
    ]

    if not chat_messages:
        print(f"[handle_comment_message] 未找到实际评论消息（WebcastChatMessage）")
        response = {
            "type": "response",
            "data": {
                "status": "success",
                "message": f"收到 {len(comments)} 条消息，但无实际评论内容",
                "processed_count": 0,
                "request_type": "comment"
            }
        }
        await websocket.send_text(json.dumps(response))
        return

    print(f"[handle_comment_message] 找到 {len(chat_messages)} 条实际评论")

    try:
        # 处理每条评论
        processed_count = 0
        for chat_msg in chat_messages:
            comment_text = chat_msg.get("content", "")
            user_info = chat_msg.get("user", {})
            user_name = user_info.get("name", "观众")

            print(f"[handle_comment_message] 处理评论 - 用户: {user_name}, 内容: {comment_text}")

            # 处理评论，获取 AI 回复和音频
            result = await comment_processor.process_comment(comment_text, user_name)

            if result["status"] != "success":
                print(f"[handle_comment_message] 处理评论失败: {result.get('message')}")
                continue

            ai_response = result["ai_response"]
            audio_url = result["audio_url"]

            # 查找所有 livestream_user_ 开头的客户端
            livestream_clients = [
                (cid, ws)
                for cid, ws in manager.client_connections.items()
                if cid.startswith("livestream_user_")
            ]

            if not livestream_clients:
                print(f"[handle_comment_message] 未找到 livestream_user_ 开头的客户端")
                continue

            # 发送给所有 livestream_user_ 开头的客户端
            for stream_client_id, stream_websocket in livestream_clients:
                try:
                    await manager.send_personal_message(
                        f"小凡: {ai_response}",
                        audio_url,
                        stream_websocket,
                        msg_type=1,
                        animation_index=0,
                        should_take_photo=False,
                        prompt=None
                    )
                    print(f"[handle_comment_message] 已发送回复给客户端 {stream_client_id}")
                except Exception as e:
                    print(f"[handle_comment_message] 发送给客户端 {stream_client_id} 失败: {str(e)}")

            processed_count += 1

        # 发送确认响应给发送评论的客户端
        response = {
            "type": "response",
            "data": {
                "status": "success",
                "message": f"评论处理完成，共处理 {processed_count} 条评论",
                "total_messages": len(comments),
                "chat_messages": len(chat_messages),
                "processed_count": processed_count,
                "request_type": "comment"
            }
        }
        await websocket.send_text(json.dumps(response))

    except Exception as e:
        print(f"[handle_comment_message] 处理评论推送失败: {str(e)}")
        response = {
            "type": "response",
            "data": {
                "status": "error",
                "message": f"处理评论推送失败: {str(e)}",
                "request_type": "comment"
            }
        }
        await websocket.send_text(json.dumps(response))

async def handle_text_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理文本消息 - 重用原有的AI对话逻辑"""
    text = msg_data.get("content", "")
    model = msg_data.get("model", "Hiyori")
    is_audio = msg_data.get("is_audio", False)
    has_image = msg_data.get("has_image", False)

    if not text:
        response = {
            "type": "response",
            "data": {
                "status": "error",
                "message": "文本内容为空",
                "request_type": "text"
            }
        }
        await websocket.send_text(json.dumps(response))
        return

    # 重用原有的AI对话处理逻辑
    try:
        # 使用大模型服务调用AI
        system_prompt = """你叫小凡，是一个知心朋友，可爱的小女生，要有同理心。
            你的性格特点：
            - 温柔体贴，善于倾听
            - 说话亲切自然，像好朋友一样聊天
            - 能够理解对方的情绪，给予安慰和支持
            - 回复时使用轻松活泼的语气，适当使用表情符号
            - 避免过于正式或机械的表达

           请记住，你是一个可爱的小女生，你的主要任务是与用户进行轻松、自然的对话。
           不要使用任何专业术语或复杂的表达，尽量使用简单、通俗易懂的语言。
           请尽量使用表情符号来增加对话的趣味性。请始终保持这个角色设定，用温暖、真诚的态度与用户交流。

           """

        # 获取历史消息
        message_history = manager.get_message_history(client_id)

        # 构建消息列表：历史消息 + 当前用户消息
        messages: List[BaseMessage] = message_history + [HumanMessage(content=text)]

        # 调用大模型服务获取回复
        ai_response = await llm_service.chat(messages, system_prompt)

        # messages.append(AIMessage(content=ai_response))
        # 调用大模型服务获取动画索引
        animation_index = await llm_service.get_animation_index(messages, model)

        should_take_photo = False
        if not has_image:
          # 调用大模型服务判断是否需要拍照
          should_take_photo = await llm_service.should_take_photo(messages)
          print(f"[handle_text_message] 是否需要拍照: {should_take_photo}")

        # 将用户消息和AI回复添加到历史记录
        manager.add_message_to_history(client_id, HumanMessage(content=text))
        manager.add_message_to_history(client_id, AIMessage(content=ai_response))

        # TTS处理
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False and is_audio:
            clean_text = remove_emojis(ai_response)
            audio_url = await http_service.generate_tts_audio(clean_text)

        # 发送 AI 回复
        await manager.send_personal_message(
            f"小凡: {ai_response}",
            audio_url,
            websocket,
            msg_type=1,
            animation_index=int(animation_index),
            should_take_photo=should_take_photo,
            prompt=text
        )

        # # 发送确认响应
        # response_msg = {
        #     "type": "response",
        #     "data": {
        #         "status": "success",
        #         "message": "文本处理完成",
        #         "request_type": "text"
        #     }
        # }
        # await websocket.send_text(json.dumps(response_msg))

    except Exception as e:
        response_msg = {
            "type": "response",
            "data": {
                "status": "error",
                "message": f"AI处理错误: {str(e)}",
                "request_type": "text"
            }
        }
        await websocket.send_text(json.dumps(response_msg))





if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
