from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import os
import json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage

# 加载环境变量
load_dotenv()

# 初始化 LangChain OpenAI 模型
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)

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
        # 存储每个客户端的消息历史记录
        self.message_history: Dict[str, List[BaseMessage]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket, msg_type: int = 1):
        """发送个人消息，支持多种类型

        Args:
            message: 消息内容（文字或URL）
            websocket: WebSocket连接
            msg_type: 消息类型（1:文字，2:图片，3:音频）
        """
        message_obj = {
            "type": msg_type,
            "content": message
        }
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


manager = ConnectionManager()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        # 发送欢迎消息
        await manager.send_personal_message("你好，我是你的好朋友，小凡...", websocket, msg_type=1)

        while True:
            data = await websocket.receive_text()

            # # 发送用户消息回显
            # await manager.send_personal_message(f"你: {data}", websocket)

            try:
                # 使用 LangChain 调用 OpenAI
                system_prompt = """你叫小凡，是一个知心朋友，可爱的小女生，要有同理心。
                    你的性格特点：
                    - 温柔体贴，善于倾听
                    - 说话亲切自然，像好朋友一样聊天
                    - 能够理解对方的情绪，给予安慰和支持
                    - 回复时使用轻松活泼的语气，适当使用表情符号
                    - 避免过于正式或机械的表达

                   请记住，你是一个可爱的小女生，你的主要任务是与用户进行轻松、自然的对话。
                   不要使用任何专业术语或复杂的表达，尽量使用简单、通俗易懂的语言。
                   请尽量使用表情符号来增加对话的趣味性。请始终保持这个角色设定，用温暖、真诚的态度与用户交流。"""

                # 获取历史消息
                message_history = manager.get_message_history(client_id)

                # 构建消息列表：系统提示 + 历史消息 + 当前用户消息
                messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]
                messages.extend(message_history)
                messages.append(HumanMessage(content=data))

                response = await llm.ainvoke(messages)
                ai_response = response.content

                # 将用户消息和AI回复添加到历史记录
                manager.add_message_to_history(client_id, HumanMessage(content=data))
                manager.add_message_to_history(client_id, AIMessage(content=ai_response))

                # 发送 AI 回复
                await manager.send_personal_message(f"小凡: {ai_response}", websocket, msg_type=1)

            except Exception as e:
                await manager.send_personal_message(f"AI 错误: {str(e)}", websocket, msg_type=1)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client {client_id} left the chat")
