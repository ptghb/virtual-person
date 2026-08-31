# -*- coding: utf-8 -*-
import uvicorn
import asyncio
from dataclasses import asdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Dict, Optional
import os
import json
import re
import time
import uuid
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
import emoji
from pydantic import BaseModel

from domain.memory_extractor import memory_extractor
from domain.memory_retriever import memory_retriever
from domain.memory_service import memory_service
from domain.prompt_builder import prompt_builder
from handlers.audio_handler import audio_processor, message_parser
from handlers.image_handler import image_processor
from handlers.comment_handler import comment_processor
from infrastructure.db import db_cursor, init_db
from repositories.session_repository import SessionRepository
from repositories.user_repository import UserRepository
from schemas.memory import MemoryCreateInput, MemoryStatus, MemoryType
from schemas.session import ResolvedIdentity
from services.llm_service import llm_service
from services.http_service import http_service

# 加载环境变量
load_dotenv()

app = FastAPI()
init_db()

DEFAULT_COMPANION_ID = "companion_default"
user_repository = UserRepository()
session_repository = SessionRepository()


class CreateMemoryRequest(BaseModel):
    user_id: str
    companion_id: str = DEFAULT_COMPANION_ID
    session_id: Optional[str] = None
    memory_type: str
    content: str
    title: Optional[str] = None
    importance: int = 5


class UpdateMemoryRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    importance: Optional[int] = None
    status: Optional[str] = None

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
        self.companion_profiles: Dict[str, Dict[str, str]] = {}
        self.identities: Dict[str, ResolvedIdentity] = {}

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
        self.companion_profiles.pop(client_id, None)
        self.identities.pop(client_id, None)
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

    def set_identity(self, client_id: str, identity: ResolvedIdentity):
        self.identities[client_id] = identity

    def get_identity(self, client_id: str) -> Optional[ResolvedIdentity]:
        return self.identities.get(client_id)

    def set_companion_profile(
        self,
        client_id: str,
        name: Optional[str] = None,
        personality: Optional[str] = None,
    ) -> Dict[str, str]:
        current = self.get_companion_profile(client_id)
        clean_name = re.sub(r"\s+", " ", str(name or "")).strip()[:20]
        clean_personality = str(personality or "").strip()[:500]
        profile = {
            "name": clean_name or current["name"],
            "personality": clean_personality or current["personality"],
        }
        self.companion_profiles[client_id] = profile
        return profile

    def get_companion_profile(self, client_id: str) -> Dict[str, str]:
        return self.companion_profiles.get(client_id, {
            "name": "小凡",
            "personality": (
                "温柔体贴、善于倾听，能理解用户的情绪并给予支持；"
                "说话亲切自然、轻松活泼，像亲密的朋友一样，"
                "不过分正式或机械。"
            ),
        })


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

# EasyVoice 流式任务暂存。前端收到 segment_id 后，通过 HTTP GET 拉取
# 对应的分块 MP3。当前部署为单进程内存状态。
tts_stream_segments: Dict[str, Dict[str, object]] = {}
TTS_SEGMENT_TTL_SECONDS = 10 * 60


def register_tts_stream_segment(text: str) -> str:
    now = time.time()
    expired_ids = [
        segment_id
        for segment_id, item in tts_stream_segments.items()
        if now - float(item["created_at"]) > TTS_SEGMENT_TTL_SECONDS
    ]
    for segment_id in expired_ids:
        tts_stream_segments.pop(segment_id, None)

    segment_id = uuid.uuid4().hex
    tts_stream_segments[segment_id] = {
        "text": text,
        "created_at": now,
    }
    return segment_id


def normalize_tts_text(text: str) -> str:
    # 括号中的内容通常是动作/表情注释，例如“（微笑）”“[害羞]”，
    # 不应被 TTS 朗读。循环处理可覆盖多个相邻的注释。
    clean_text = text
    bracket_patterns = (
        r"（[^（）]*）",
        r"\([^()]*\)",
        r"【[^【】]*】",
        r"\[[^\[\]]*\]",
        r"\{[^{}]*\}",
    )
    previous_text = None
    while clean_text != previous_text:
        previous_text = clean_text
        for pattern in bracket_patterns:
            clean_text = re.sub(pattern, "", clean_text)

    clean_text = remove_emojis(clean_text)
    # 波浪线在文本中表示语气延长，TTS 不应将其作为字符朗读。
    clean_text = re.sub(r"[~～]+", "。", clean_text)
    clean_text = re.sub(r"[ \t]+", " ", clean_text).strip()
    # EasyVoice 流式接口要求至少 5 个字符；只补停顿符，不改变语义。
    if clean_text and len(clean_text) < 5:
        clean_text += "，" * (5 - len(clean_text))
    return clean_text


def take_ready_tts_segments(buffer: str, force: bool = False):
    """从增量文本中提取适合语音合成的完整句子。"""
    segments = []
    remaining = buffer

    while remaining:
        boundaries = list(re.finditer(r"[。！？!?；;\n]", remaining))
        selected_end = None
        for boundary in boundaries:
            candidate = remaining[:boundary.end()].strip()
            if len(candidate) >= 8:
                selected_end = boundary.end()
                break

        if selected_end is None and len(remaining) >= 80:
            comma_positions = [
                match.end() for match in re.finditer(r"[，,、：:]", remaining[:80])
            ]
            selected_end = comma_positions[-1] if comma_positions else 80

        if selected_end is None:
            break

        segment = remaining[:selected_end].strip()
        remaining = remaining[selected_end:].lstrip()
        if segment:
            segments.append(segment)

    if force and remaining.strip():
        segments.append(remaining.strip())
        remaining = ""

    return segments, remaining


def select_animation_index(text: str, model_name: str) -> int:
    """使用本地关键词选择动作，避免为了动作额外请求一次大模型。"""
    sad_words = (
        "难过", "伤心", "心情不好", "累", "疲惫", "委屈", "哭",
        "失望", "压力", "加班",
    )
    serious_words = (
        "生气", "严肃", "认真", "担心", "害怕", "焦虑", "紧张",
    )
    model_motions = {
        "Hiyori": {"happy": 1, "serious": 3, "sad": 7},
        "Haru": {"happy": 1, "serious": 2, "sad": 1},
        "Mark": {"happy": 3, "serious": 4, "sad": 3},
        "Natori": {"happy": 5, "serious": 6, "sad": 5},
        "Rice": {"happy": 2, "serious": 3, "sad": 1},
        "Mao": {"happy": 4, "serious": 3, "sad": 2},
        "Wanko": {"happy": 1, "serious": 3, "sad": 2},
    }
    emotion = "happy"
    if any(word in text for word in sad_words):
        emotion = "sad"
    elif any(word in text for word in serious_words):
        emotion = "serious"
    return model_motions.get(model_name, model_motions["Hiyori"])[emotion]


def should_request_photo(text: str) -> bool:
    photo_words = (
        "看看我", "看我", "我的脸", "脸色", "皮肤", "妆容", "发型",
        "化妆", "粉底", "口红", "眉毛", "染发", "指甲", "美颜",
        "滤镜", "拍照", "照片", "合影", "自拍", "相机", "镜头",
    )
    return any(word in text for word in photo_words)

# 直播控制台运行策略。当前为单进程内存状态；后续如需多实例部署，
# 应迁移到 Redis 或数据库。
livestream_settings = {
    "auto_reply_enabled": True,
    "policies": {
        "chat": True,
        "member": True,
        "social": True,
        "like": True,
    }
}


def clean_identifier(value: Optional[str], fallback: str) -> str:
    candidate = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(value or "")).strip("_")
    return candidate[:80] or fallback


def resolve_mode(client_id: str, msg_data: dict) -> str:
    if msg_data.get("mode"):
        return str(msg_data["mode"])
    if client_id.startswith("advanced_user_"):
        return "advanced"
    if client_id.startswith("mobile_user_"):
        return "mobile"
    if client_id.startswith("livestream_console_"):
        return "livestream_console"
    if client_id.startswith("livestream_user_"):
        return "livestream_stage"
    return "chat"


def resolve_identity(client_id: str, msg_data: dict) -> ResolvedIdentity:
    previous_identity = manager.get_identity(client_id)
    user_id = clean_identifier(
        msg_data.get("user_id") or getattr(previous_identity, "user_id", None),
        f"user_{client_id}",
    )
    session_id = clean_identifier(
        msg_data.get("session_id") or getattr(previous_identity, "session_id", None),
        f"session_{client_id}",
    )
    companion_id = clean_identifier(
        msg_data.get("companion_id") or getattr(previous_identity, "companion_id", None),
        DEFAULT_COMPANION_ID,
    )
    identity = ResolvedIdentity(
        connection_id=client_id,
        client_id=client_id,
        user_id=user_id,
        session_id=session_id,
        companion_id=companion_id,
        mode=resolve_mode(client_id, msg_data),
    )
    manager.set_identity(client_id, identity)
    return identity


def upsert_companion_record(companion_id: str, name: str, personality: str) -> None:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO companions (id, name, base_personality, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              base_personality = excluded.base_personality,
              updated_at = excluded.updated_at
            """,
            (companion_id, name, personality, now, now),
        )


def register_identity_context(identity: ResolvedIdentity, profile: Dict[str, str]) -> None:
    user_repository.upsert_user(identity.user_id)
    upsert_companion_record(
        identity.companion_id,
        profile["name"],
        profile["personality"],
    )
    session_repository.upsert_session(
        session_id=identity.session_id,
        user_id=identity.user_id,
        companion_id=identity.companion_id,
        mode=identity.mode,
        metadata={"client_id": identity.client_id},
    )


def memory_item_to_dict(memory_item) -> dict:
    payload = asdict(memory_item)
    payload["memory_type"] = memory_item.memory_type.value
    payload["status"] = memory_item.status.value
    return payload


async def update_memories_after_reply(
    identity: ResolvedIdentity,
    user_message: str,
    ai_message: str,
) -> None:
    try:
        memory_service.resolve_followups_from_message(
            user_id=identity.user_id,
            companion_id=identity.companion_id,
            user_message=user_message,
        )
        extracted = await memory_extractor.extract(
            user_id=identity.user_id,
            companion_id=identity.companion_id,
            session_id=identity.session_id,
            user_message=user_message,
            ai_message=ai_message,
        )
        if extracted.summary and extracted.summary.content.strip():
            session_repository.update_summary(identity.session_id, extracted.summary.content)
            memory_service.create_memory(extracted.summary)
        for fact in extracted.facts:
            if fact.content.strip():
                memory_service.create_memory(fact)
        for event in extracted.events:
            if event.content.strip():
                memory_service.create_memory(event)
        for followup in extracted.followups:
            if followup.content.strip():
                memory_service.create_memory(followup)
        if extracted.relationship and extracted.relationship.content.strip():
            memory_service.create_memory(extracted.relationship)
    except Exception as error:
        print(f"[memory] 更新记忆失败: {error}")


def get_livestream_output_clients():
    """获取直播舞台和控制台连接。"""
    return [
        (cid, ws)
        for cid, ws in manager.client_connections.items()
        if cid.startswith("livestream_user_")
        or cid.startswith("livestream_console_")
    ]


async def broadcast_livestream_event_batch(comments: list):
    """把原始直播事件同步给直播控制台，用于事件流和统计展示。"""
    payload = json.dumps({
        "type": "livestream.event_batch",
        "data": {
            "comments": comments,
            "settings": livestream_settings,
        }
    })
    console_clients = [
        (cid, ws)
        for cid, ws in manager.client_connections.items()
        if cid.startswith("livestream_console_")
    ]
    for console_client_id, console_websocket in console_clients:
        try:
            await console_websocket.send_text(payload)
        except Exception as e:
            print(
                f"[broadcast_livestream_event_batch] "
                f"发送给 {console_client_id} 失败: {str(e)}"
            )


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


@app.get("/api/memories")
async def list_memories(
    user_id: str = Query(...),
    companion_id: str = Query(DEFAULT_COMPANION_ID),
    memory_type: Optional[str] = Query(None),
    status: str = Query(MemoryStatus.ACTIVE.value),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None),
):
    try:
        parsed_type = MemoryType(memory_type) if memory_type else None
        parsed_status = MemoryStatus(status)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    items = memory_service.list_memories(
        user_id=user_id,
        companion_id=companion_id,
        memory_type=parsed_type,
        status=parsed_status,
        limit=limit,
        keyword=keyword,
    )
    return {
        "items": [memory_item_to_dict(item) for item in items],
        "total": len(items),
    }


@app.post("/api/memories")
async def create_memory(payload: CreateMemoryRequest):
    try:
        memory_type = MemoryType(payload.memory_type)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if memory_type != MemoryType.PINNED:
        raise HTTPException(status_code=400, detail="Phase 1 仅支持手动创建 pinned 记忆")
    user_repository.upsert_user(payload.user_id)
    default_profile = manager.get_companion_profile("manual_seed")
    upsert_companion_record(
        payload.companion_id,
        name=default_profile["name"],
        personality=default_profile["personality"],
    )
    if payload.session_id:
        session_repository.upsert_session(
            session_id=payload.session_id,
            user_id=payload.user_id,
            companion_id=payload.companion_id,
            mode="chat",
        )
    item = memory_service.upsert_pinned_memory(
        user_id=payload.user_id,
        companion_id=payload.companion_id,
        content=payload.content,
        title=payload.title,
        session_id=payload.session_id,
        importance=payload.importance,
    )
    return {"id": item.id, "status": item.status.value}


@app.patch("/api/memories/{memory_id}")
async def update_memory(memory_id: str, payload: UpdateMemoryRequest):
    parsed_status = None
    if payload.status is not None:
        try:
            parsed_status = MemoryStatus(payload.status)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
    item = memory_service.update_memory(
        memory_id=memory_id,
        title=payload.title,
        content=payload.content,
        importance=payload.importance,
        status=parsed_status,
    )
    if not item:
        raise HTTPException(status_code=404, detail="记忆不存在")
    return {"id": item.id, "status": item.status.value}


@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: str):
    item = memory_service.delete_memory(memory_id)
    if not item:
        raise HTTPException(status_code=404, detail="记忆不存在")
    return {"id": item.id, "status": item.status.value}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = session_repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return asdict(session)


@app.get("/api/tts/stream/{segment_id}")
async def stream_tts_segment(segment_id: str):
    segment = tts_stream_segments.get(segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="语音片段不存在或已过期")

    return StreamingResponse(
        http_service.stream_tts_audio(str(segment["text"])),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        # 发送欢迎消息
        await manager.send_personal_message(
            "你好，很高兴见到你，我们来聊聊天吧～",
            "",
            websocket,
            msg_type=1,
        )

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

# 新增的处理函数
async def handle_control_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理控制消息"""
    action = msg_data.get("action", "")
    identity = resolve_identity(client_id, msg_data)
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
        transcription = (
            await audio_processor._process_complete_audio(client_id)
        ) or ""

        audio_processor.stop_audio_stream(client_id)

        # 如果有识别结果，将其传递给AI对话系统
        if transcription:
            await websocket.send_text(json.dumps({
                "type": "speech.transcription",
                "data": {
                    "content": transcription,
                },
            }))

            # 构造文本消息并处理
            text_msg_data = {
                "content": transcription,
                "model": "Hiyori",
                "is_audio": True,
                **manager.get_companion_profile(client_id),
            }
            await handle_text_message(websocket, client_id, text_msg_data)
        else:
            response = {
                "type": "response",
                "data": {
                    "status": "error",
                    "message": "语音识别失败，请检查麦克风录音、网络或语音识别服务状态",
                    "request_type": "control",
                    "transcription": ""
                }
            }
            print(f"[handle_control_message] 发送响应: {response}")
            await websocket.send_text(json.dumps(response))

    elif action == "livestream_set_auto_reply":
        enabled = bool(msg_data.get("enabled", True))
        livestream_settings["auto_reply_enabled"] = enabled
        response = {
            "type": "livestream.policy",
            "data": livestream_settings,
        }
        await websocket.send_text(json.dumps(response))

    elif action == "livestream_update_policy":
        incoming_policies = msg_data.get("policies", {})
        allowed_policies = livestream_settings["policies"]
        if isinstance(incoming_policies, dict):
            for key in allowed_policies:
                if key in incoming_policies:
                    allowed_policies[key] = bool(incoming_policies[key])
        response = {
            "type": "livestream.policy",
            "data": livestream_settings,
        }
        await websocket.send_text(json.dumps(response))

    elif action == "livestream_clear_queue":
        # 当前直播消息为即时批处理，尚无持久化队列。
        response = {
            "type": "response",
            "data": {
                "status": "success",
                "message": "当前没有待清理的持久化直播队列",
                "request_type": "control",
            }
        }
        await websocket.send_text(json.dumps(response))

    elif action == "update_companion_profile":
        profile = manager.set_companion_profile(
            client_id,
            msg_data.get("companion_name"),
            msg_data.get("personality"),
        )
        register_identity_context(identity, profile)

    elif action == "memory.list":
        items = memory_service.list_memories(
            user_id=identity.user_id,
            companion_id=identity.companion_id,
            memory_type=MemoryType.PINNED,
            limit=20,
        )
        await websocket.send_text(json.dumps({
            "type": "response",
            "data": {
                "status": "success",
                "message": "记忆列表获取成功",
                "request_type": "control",
                "items": [memory_item_to_dict(item) for item in items],
            }
        }))

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
    identity = resolve_identity(client_id, msg_data)

    profile = manager.set_companion_profile(
        client_id,
        msg_data.get("companion_name"),
        msg_data.get("personality"),
    )
    register_identity_context(identity, profile)
    msg_data["companion_name"] = profile["name"]
    msg_data["personality"] = profile["personality"]

    # 处理图片消息
    result = await image_processor.process_image_message(msg_data)

    # 同时发送AI对图片的描述作为聊天消息
    if result["status"] == "success" and "description" in result:
        ai_response = result["description"]
        # await manager.send_personal_message(f"图片分析结果: {description}", "", websocket, msg_type=1)

        humanMessage = msg_data.get("prompt", None) if msg_data.get("prompt", None) else "拍照"
        # 将用户消息和AI回复添加到历史记录
        manager.add_message_to_history(identity.session_id, HumanMessage(content=humanMessage))
        manager.add_message_to_history(identity.session_id, AIMessage(content=ai_response))

        # TTS处理
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False and is_audio:
          clean_text = normalize_tts_text(ai_response)
          audio_url = await http_service.generate_tts_audio(clean_text)

        # 发送 AI 回复
        await manager.send_personal_message(
          f"{profile['name']}: {ai_response}",
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
        # await websocket.send_text(json.dumps(response))
        return

    await broadcast_livestream_event_batch(comments)

    if not livestream_settings["auto_reply_enabled"]:
        print("[handle_comment_message] 自动回复已暂停，仅同步事件到控制台")
        return

    policies = livestream_settings["policies"]
    livestream_clients = get_livestream_output_clients()
    livestream_profile = (
        manager.get_companion_profile(livestream_clients[0][0])
        if livestream_clients
        else manager.get_companion_profile(client_id)
    )
    companion_name = livestream_profile["name"]

    # 过滤出不同类型的消息
    member_messages = [
        msg for msg in comments
        if policies["member"]
        and msg.get("method") == "WebcastMemberMessage"
    ]

    social_messages = [
        msg for msg in comments
        if policies["social"]
        and msg.get("method") == "WebcastSocialMessage"
    ]

    like_messages = [
        msg for msg in comments
        if policies["like"]
        and msg.get("method") == "WebcastLikeMessage"
    ]

    chat_messages = [
        msg for msg in comments
        if policies["chat"]
        and msg.get("method") == "WebcastChatMessage"
        and msg.get("content")
    ]

    # 打印各类消息统计
    print(f"[handle_comment_message] 进入直播间消息: {len(member_messages)} 条")
    print(f"[handle_comment_message] 关注消息: {len(social_messages)} 条")
    print(f"[handle_comment_message] 点赞消息: {len(like_messages)} 条")
    print(f"[handle_comment_message] 实际评论消息: {len(chat_messages)} 条")

    # 处理进入直播间的消息
    if member_messages:
        member_names = []
        for msg in member_messages:
            user_info = msg.get("user", {})
            user_name = user_info.get("name", "观众")
            member_names.append(user_name)

        # 生成欢迎消息
        if len(member_names) == 1:
            welcome_msg = f"欢迎{member_names[0]}进入直播间"
        elif len(member_names) == 2:
            welcome_msg = f"欢迎{member_names[0]}和{member_names[1]}进入直播间"
        else:
            welcome_msg = f"欢迎{', '.join(member_names[:-1])}和{member_names[-1]}进入直播间"

        print(f"[handle_comment_message] 生成欢迎消息: {welcome_msg}")

        # 生成 TTS 音频
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False:
            clean_text = normalize_tts_text(welcome_msg)
            audio_url = await http_service.generate_tts_audio(clean_text)
            print(f"[handle_comment_message] TTS 音频生成完成: {audio_url}")

        # 查找所有 livestream_user_ 开头的客户端
        # 发送欢迎消息给所有 livestream_user_ 开头的客户端
        for stream_client_id, stream_websocket in livestream_clients:
            try:
                await manager.send_personal_message(
                    f"{companion_name}: {welcome_msg}",
                    audio_url,
                    stream_websocket,
                    msg_type=1,
                    animation_index=0,
                    should_take_photo=False,
                    prompt=None
                )
                print(f"[handle_comment_message] 已发送欢迎消息给客户端 {stream_client_id}")
            except Exception as e:
                print(f"[handle_comment_message] 发送欢迎消息给客户端 {stream_client_id} 失败: {str(e)}")

    # 处理关注消息
    if social_messages:
        social_names = []
        for msg in social_messages:
            user_info = msg.get("user", {})
            user_name = user_info.get("name", "观众")
            social_names.append(user_name)

        # 生成感谢关注消息
        if len(social_names) == 1:
            thanks_msg = f"感谢{social_names[0]}的关注"
        elif len(social_names) == 2:
            thanks_msg = f"感谢{social_names[0]}和{social_names[1]}的关注"
        else:
            thanks_msg = f"感谢{', '.join(social_names[:-1])}和{social_names[-1]}的关注"

        print(f"[handle_comment_message] 生成感谢关注消息: {thanks_msg}")

        # 生成 TTS 音频
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False:
            clean_text = normalize_tts_text(thanks_msg)
            audio_url = await http_service.generate_tts_audio(clean_text)
            print(f"[handle_comment_message] TTS 音频生成完成: {audio_url}")

        # 查找所有 livestream_user_ 开头的客户端
        # 发送感谢关注消息给所有 livestream_user_ 开头的客户端
        for stream_client_id, stream_websocket in livestream_clients:
            try:
                await manager.send_personal_message(
                    f"{companion_name}: {thanks_msg}",
                    audio_url,
                    stream_websocket,
                    msg_type=1,
                    animation_index=0,
                    should_take_photo=False,
                    prompt=None
                )
                print(f"[handle_comment_message] 已发送感谢关注消息给客户端 {stream_client_id}")
            except Exception as e:
                print(f"[handle_comment_message] 发送感谢关注消息给客户端 {stream_client_id} 失败: {str(e)}")

    # 处理点赞消息
    if like_messages:
        # 去重：使用集合去除重复的用户名
        like_names_set = set()
        for msg in like_messages:
            user_info = msg.get("user", {})
            user_name = user_info.get("name", "观众")
            like_names_set.add(user_name)

        like_names = list(like_names_set)

        # 生成感谢点赞消息
        if len(like_names) == 1:
            like_msg = f"感谢{like_names[0]}的点赞"
        elif len(like_names) == 2:
            like_msg = f"感谢{like_names[0]}和{like_names[1]}的点赞"
        else:
            like_msg = f"感谢{', '.join(like_names[:-1])}和{like_names[-1]}的点赞"

        print(f"[handle_comment_message] 生成感谢点赞消息: {like_msg}")

        # 生成 TTS 音频
        audio_url = ""
        if os.getenv("ISAUDIO", False) != False:
            clean_text = normalize_tts_text(like_msg)
            audio_url = await http_service.generate_tts_audio(clean_text)
            print(f"[handle_comment_message] TTS 音频生成完成: {audio_url}")

        # 查找所有 livestream_user_ 开头的客户端
        # 发送感谢点赞消息给所有 livestream_user_ 开头的客户端
        for stream_client_id, stream_websocket in livestream_clients:
            try:
                await manager.send_personal_message(
                    f"{companion_name}: {like_msg}",
                    audio_url,
                    stream_websocket,
                    msg_type=1,
                    animation_index=0,
                    should_take_photo=False,
                    prompt=None
                )
                print(f"[handle_comment_message] 已发送感谢点赞消息给客户端 {stream_client_id}")
            except Exception as e:
                print(f"[handle_comment_message] 发送感谢点赞消息给客户端 {stream_client_id} 失败: {str(e)}")

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
        # await websocket.send_text(json.dumps(response))
        return

    print(f"[handle_comment_message] 找到 {len(chat_messages)} 条实际评论")

    try:
        # 批量整合评论消息为一个字符串
        if chat_messages:
            chat_messages_str = "\n".join([
                f"{chat_msg.get('user', {}).get('name', '观众')}：{chat_msg.get('content', '')}"
                for chat_msg in chat_messages
            ])
            print(f"[handle_comment_message] 批量评论内容:\n{chat_messages_str}")
        else:
            chat_messages_str = ""

        # 处理每条评论
        processed_count = 0
        # 批量处理评论消息，传入整合后的评论字符串
        if chat_messages:
            print(f"[handle_comment_message] 批量处理 {len(chat_messages)} 条评论")
            print(f"[handle_comment_message] 评论内容:\n{chat_messages_str}")

            # 处理评论，获取 AI 回复和音频，传入批量评论消息
            result = await comment_processor.process_comment(
                chat_messages_str,
                companion_name=companion_name,
                personality=livestream_profile["personality"],
            )

            if result["status"] == "success":
                ai_response = result["ai_response"]
                audio_url = result["audio_url"]

                # 查找所有 livestream_user_ 开头的客户端
                livestream_clients = get_livestream_output_clients()

                if livestream_clients:
                    # 发送给所有 livestream_user_ 开头的客户端
                    for stream_client_id, stream_websocket in livestream_clients:
                        try:
                            await manager.send_personal_message(
                                f"{companion_name}: {ai_response}",
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

                    processed_count = len(chat_messages)
                else:
                    print(f"[handle_comment_message] 未找到 livestream_user_ 开头的客户端")
            else:
                print(f"[handle_comment_message] 处理评论失败: {result.get('message')}")

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
        # await websocket.send_text(json.dumps(response))

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
        # await websocket.send_text(json.dumps(response))

async def handle_text_message(websocket: WebSocket, client_id: str, msg_data: dict):
    """处理文本消息：流式文字 + 分句流式 TTS。"""
    text = msg_data.get("content", "")
    model = msg_data.get("model", "Hiyori")
    is_audio = msg_data.get("is_audio", False)
    has_image = msg_data.get("has_image", False)
    identity = resolve_identity(client_id, msg_data)
    profile = manager.set_companion_profile(
        client_id,
        msg_data.get("companion_name") or msg_data.get("name"),
        msg_data.get("personality"),
    )
    register_identity_context(identity, profile)

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

    try:
        memory_pack = memory_retriever.retrieve(
            user_id=identity.user_id,
            companion_id=identity.companion_id,
            current_text=text,
            session_id=identity.session_id,
        )
        system_prompt = prompt_builder.build_system_prompt(
            companion_name=profile["name"],
            personality=profile["personality"],
            memory_pack=memory_pack,
        )
        message_history = manager.get_message_history(identity.session_id)
        messages: List[BaseMessage] = prompt_builder.build_messages(message_history, text)
        reply_id = f"reply_{uuid.uuid4().hex}"
        audio_requested = bool(is_audio) and os.getenv(
            "ISAUDIO", "false"
        ).lower() in {"1", "true", "yes", "on"}

        await websocket.send_text(json.dumps({
            "type": "assistant.start",
            "data": {
                "reply_id": reply_id,
                "prompt": text,
            },
        }))
        await websocket.send_text(json.dumps({
            "type": "assistant.meta",
            "data": {
                "reply_id": reply_id,
                "animation_index": select_animation_index(text, model),
                "should_take_photo": (
                        identity.mode == "advanced"
                    and not has_image
                    and should_request_photo(text)
                ),
                "prompt": text,
            },
        }))

        response_parts = []
        tts_buffer = ""
        segment_sequence = 0

        async for delta in llm_service.stream_chat(messages, system_prompt):
            response_parts.append(delta)
            await websocket.send_text(json.dumps({
                "type": "assistant.delta",
                "data": {
                    "reply_id": reply_id,
                    "delta": delta,
                },
            }))

            if audio_requested:
                tts_buffer += delta
                ready_segments, tts_buffer = take_ready_tts_segments(tts_buffer)
                for segment_text in ready_segments:
                    clean_segment = normalize_tts_text(segment_text)
                    if not clean_segment:
                        continue
                    segment_id = register_tts_stream_segment(clean_segment)
                    await websocket.send_text(json.dumps({
                        "type": "assistant.audio_segment",
                        "data": {
                            "reply_id": reply_id,
                            "sequence": segment_sequence,
                            "text": segment_text,
                            "audio_url": f"/api/tts/stream/{segment_id}",
                        },
                    }))
                    segment_sequence += 1

        ai_response = "".join(response_parts).strip()

        if audio_requested:
            final_segments, _ = take_ready_tts_segments(tts_buffer, force=True)
            for segment_text in final_segments:
                clean_segment = normalize_tts_text(segment_text)
                if not clean_segment:
                    continue
                segment_id = register_tts_stream_segment(clean_segment)
                await websocket.send_text(json.dumps({
                    "type": "assistant.audio_segment",
                    "data": {
                        "reply_id": reply_id,
                        "sequence": segment_sequence,
                        "text": segment_text,
                        "audio_url": f"/api/tts/stream/{segment_id}",
                    },
                }))
                segment_sequence += 1

        manager.add_message_to_history(identity.session_id, HumanMessage(content=text))
        manager.add_message_to_history(identity.session_id, AIMessage(content=ai_response))
        asyncio.create_task(
            update_memories_after_reply(
                identity=identity,
                user_message=text,
                ai_message=ai_response,
            )
        )

        await websocket.send_text(json.dumps({
            "type": "assistant.complete",
            "data": {
                "reply_id": reply_id,
                "content": ai_response,
                "audio_segments": segment_sequence,
            },
        }))

    except Exception as e:
        response_msg = {
            "type": "assistant.error",
            "data": {
                "reply_id": locals().get("reply_id"),
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
