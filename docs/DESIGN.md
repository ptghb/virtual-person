# 详细设计文档

## 1. 设计目标与原则

### 1.1 目标

- 在浏览器中稳定渲染和控制多个 Live2D 模型；
- 通过一条 WebSocket 支持文字、音频、图片和直播评论；
- 将 AI 回复映射为文字、语音、动作和摄像头指令；
- 保持外部 AI/TTS/ASR 服务可替换。

### 1.2 当前设计原则

- 单例管理全局资源：Live2D、音频、WebSocket；
- 按消息类型进行后端函数分发；
- 外部调用集中在 `services`；
- 传输层采用宽松 JSON 字典，便于快速扩展。

## 2. 前端详细设计

### 2.1 应用启动

`main.tsx` 在 `window.load` 中依次完成：

1. `LAppDelegate.initialize()` 初始化 Cubism 和 Canvas；
2. `LAppDelegate.run()` 启动 `requestAnimationFrame` 循环；
3. 创建 React Root 并渲染 `App`；
4. 页面卸载时释放 Live2D 和 WebSocket 单例。

这种设计使 Live2D Canvas 不受 React 虚拟 DOM 管理。优点是复用了 Cubism 官方示例结构；代价是 React 组件需要穿透单例访问内部 `_subdelegates`。

### 2.2 页面与路由

| 路由 | 页面 | 用途 |
| --- | --- | --- |
| `/` | `HomePage` | 完整控制台、聊天、动作、缩放和手势 |
| `/mobile` | `MobilePage` | 移动端文字/录音 |
| `/livestream` | `LiveStreamPage` | 直播输出，接收 `livestream_user_*` 广播 |

使用 `BrowserRouter`，生产 Web 服务器必须将未知前端路径回退到 `index.html`。

### 2.3 WebSocketManager

#### 状态

```text
disconnected -> connecting -> connected
      ^              |            |
      |              v            v
      +------------ error <- onerror
      +-------------------- onclose + 延时重连
```

#### 主要设计

- 单例确保页面内共享同一连接；
- `_displayMessages` 最多保留 100 条；
- `onMessage` 和 `onStateChange` 各只支持一个回调，后注册者会覆盖先注册者；
- `disconnect()` 后的 `onclose` 仍可能进入自动重连逻辑，因为没有“主动关闭”标志；
- 构造器中的 `_clientId` 与 URL 路径里的 client id 可能不一致：页面通常只把新 id 放进 URL，没有调用 `setClientId()`。

#### 接收处理

后端业务消息形态为：

```json
{
  "type": 1,
  "content": "小凡: ...",
  "audio": "http://...",
  "animation_index": 1,
  "should_take_photo": false,
  "prompt": "..."
}
```

前端将：

- `content` 转为显示消息；
- `audio` 交给 `LAppAudioManager`；
- `animation_index` 转为 `change-animation` 事件；
- `should_take_photo` 转为 `should-take-photo` 事件。

注意：后端的标准响应 `{type:"response", data:{...}}` 不符合上述结构，会在 UI 中被解析为空内容。

### 2.4 Live2D 渲染

`LAppDelegate -> LAppSubdelegate -> LAppLive2DManager -> LAppModel` 构成渲染主链：

- Delegate：应用生命周期、Canvas、事件监听和帧循环；
- Subdelegate：每 Canvas 的 WebGL 上下文及 View；
- Manager：当前场景/模型、模型切换和动作调用；
- Model：资源加载、动作、表情、物理、姿势、拖拽、绘制。

模型清单位于 `lappdefine.ts`，当前为：

`Hiyori、Haru、Mark、Natori、Rice、Mao、Wanko`。

### 2.5 音频与口型

`LAppAudioManager` 使用 Web Audio API：

1. `fetch(audioUrl)` 获取 `ArrayBuffer`；
2. `AudioContext.decodeAudioData` 解码；
3. 播放节点连接 `AnalyserNode`；
4. `LAppModel.update()` 读取 RMS 并写入口型参数。

页面组件分别实现了相似的音频加载代码，后续宜抽取统一的 `playReplyAudio(url)` 服务，处理并发回复、取消和错误。

### 2.6 麦克风与摄像头

- 麦克风：`MediaRecorder(audio/webm;codecs=opus)`，100ms 分块。
- 摄像头：`getUserMedia(video)`，Canvas 截帧，JPEG 质量 0.8。
- 自动拍照：由后端布尔指令触发浏览器事件。

当前 `IMAGE_CONFIG` 中最大尺寸和 5MB 限制仅定义，未在发送前实际执行。

### 2.7 手势识别

`HandGestureService` 封装 MediaPipe Hands，周期性将视频帧送入模型，并把关键点结果映射为 Live2D 手指/手臂参数。该能力完全在前端运行，不经过后端。

## 3. 后端详细设计

### 3.1 应用入口

`main.py` 同时承担：

- FastAPI 初始化和 CORS；
- WebSocket 路由；
- 连接管理；
- 五类业务消息编排；
- 角色 Prompt；
- 直播事件业务规则。

当前便于快速开发，但文件职责偏重。建议演进为：

```text
app/
├── api/websocket.py
├── domain/chat_service.py
├── domain/livestream_service.py
├── schemas/messages.py
├── infrastructure/llm.py
├── infrastructure/tts.py
└── state/connection_registry.py
```

### 3.2 ConnectionManager

数据结构：

```python
active_connections: List[WebSocket]
client_connections: Dict[str, WebSocket]
message_history: Dict[str, List[BaseMessage]]
```

约束与边界：

- 相同 `client_id` 再连接会覆盖字典映射，但旧连接仍可能留在列表；
- 断开连接不清除 `message_history`；
- 广播未逐连接隔离异常；
- 无锁设计依赖单进程事件循环；
- 无鉴权，任何连接都可声明为直播展示端。

### 3.3 消息解析与分发

入口支持两种顶层格式：

1. 对象：`{"type":"text","data":{...}}`；
2. 数组：视为 dycast 评论数组，包装为 `comment`。

未知 `type` 当前不会返回明确错误。建议通过 Pydantic 判别联合定义版本化 schema，并统一错误码。

### 3.4 文本处理

输入：`content`、`model`、`is_audio`、`has_image`。

编排步骤：

1. 获取客户端历史；
2. 调用 `llm_service.chat()`；
3. 再次调用模型选择动作；
4. 在无图片时再次调用模型判断是否拍照；
5. 写入历史；
6. 可选调用 TTS；
7. 返回业务消息。

设计风险：

- 单次消息 2～3 次 LLM 调用，成本与延迟较高；
- 历史无上限和摘要策略；
- 动画返回虽然有 `int()` 兜底，但主函数再次 `int(animation_index)`；
- Prompt 写在业务函数中，不便版本管理和测试。

### 3.5 图片处理

`ImageProcessor`：

- Base64 解码；
- Pillow 检测 JPEG/PNG/GIF/WEBP；
- 调用 `LLMService.analyze_image()`；
- 返回描述和时间戳。

视觉模型固定使用智谱客户端。发送给模型的 data URL MIME 固定为 `image/jpeg`，即使原图为 PNG/GIF/WEBP。

### 3.6 音频处理

`AudioProcessor` 为每个 client 保存字节块列表：

- `start_audio_stream`：重置缓冲；
- `audio`：Base64 解码后追加；
- `stop_audio_stream`：拼接、写本地文件、调用 ASR、清空缓冲。

当前问题：

- `handle_audio_message` 构造了响应但没有 `send_text`，客户端得不到分块确认；
- 最终空块会被判定为“音频数据为空”；
- 停止处理无音频时返回 `None`，随后 `send_text(transcription)` 可能收到非字符串；
- 文件名扩展与实际编码不一致；
- 无单连接最大时长/大小限制和过期缓冲清理。

### 3.7 直播评论处理

后端按 `method` 分类：

- `WebcastMemberMessage`：欢迎进入；
- `WebcastSocialMessage`：感谢关注；
- `WebcastLikeMessage`：按用户名去重后感谢点赞；
- `WebcastChatMessage`：将本批评论拼接后生成一次 AI 回复。

所有回复只发送给连接表中 `client_id.startswith("livestream_user_")` 的客户端。

`CommentProcessor.message_history` 是全局共享的，意味着不同直播间和不同转发连接会共用上下文。生产化时应至少按 `room_id` 隔离。

### 3.8 LLM 适配

| 能力 | OpenAI 模式 | 智谱模式 |
| --- | --- | --- |
| 普通文本对话 | `ChatOpenAI` | 智谱 SDK |
| 动画选择 | 同文本模型 | 同文本模型 |
| 拍照判断 | 同文本模型 | 同文本模型 |
| 图片分析 | 智谱 SDK | 智谱 SDK |

智谱消息转换当前用 `hasattr(msg, "role")` 判断角色；LangChain 的 `HumanMessage/AIMessage` 通常依靠类型而非 `role` 属性，存在把历史 AI 消息错误映射为 `user` 的风险。

### 3.9 TTS 与 ASR

TTS 请求固定音色 `zh-CN-XiaoxiaoNeural`。成功后用：

```text
AUDIO_URL + response.data.audio
```

生成浏览器访问地址。`TTS_API_URL` 是后端访问地址，`AUDIO_URL` 是浏览器访问地址，两者在 Docker 中通常不同，必须分别配置。

## 4. dycast 详细设计

### 4.1 采集

1. `/dylive/{room}` 获取直播页面和 Cookie；
2. `/dylive/webcast/im/fetch/` 获取首次 cursor/internalExt；
3. 计算 signature；
4. 连接同源 `/socket/webcast/im/push/v2/`；
5. 解码 `PushFrame -> gzip -> Response -> Message`；
6. 按 method 解码具体消息。

### 4.2 转发

`RelayCast` 是普通浏览器 WebSocket 客户端。连接成功时先发送直播间信息对象，之后每批发送 `DyMessage[]`。

FastAPI 当前只显式支持数组批次；首个直播间信息对象没有 `type`，会被解析成空类型并被忽略。

### 4.3 去重

UI 使用消息 `id` 的 Set 去重；礼物只保留 `repeatEnd` 为假值的消息。转发调用使用原始 `msgs`，并非去重后的 `newCasts`，因此后端仍可能收到 UI 已过滤的重复消息。

## 5. 异常与恢复设计

| 场景 | 当前行为 | 建议 |
| --- | --- | --- |
| WebSocket JSON 非法 | 返回文字错误 | 保留，并增加错误码 |
| LLM 调用失败 | 返回 `response/error` | 增加超时、重试和降级回复 |
| TTS 失败 | 返回空/`null` 音频 | 明确统一为空字符串 |
| 前端连接断开 | 最多重连 5 次 | 区分主动断开与异常断开 |
| dycast 无消息 | 心跳检测并重连 | 增加状态指标 |
| 图片非法 | 后端拒绝 | 增加尺寸和消息体限制 |
| ASR 失败 | 返回空文本 | 返回结构化失败，不进入聊天 |

## 6. 安全设计要求

当前未实现但生产环境必须补齐：

1. WebSocket 握手鉴权和角色声明签名；
2. `client_id` 服务端生成或校验；
3. CORS 白名单；
4. 每条消息、每连接、每 IP 的大小与速率限制；
5. 图片/音频内容和 Prompt 的审计策略；
6. API 密钥只通过 Secret 注入，禁止进入镜像和日志；
7. 日志脱敏，不打印 Base64、Token 和完整用户输入；
8. HTTPS/WSS，摄像头与麦克风页面禁止明文公网访问。

## 7. 测试设计

### 7.1 当前可执行检查

```bash
python3 -m compileall -q BackendProject
cd FrontendProject/TypeScript/AI && npm run test && npm run build:prod
cd dycast && npm run type-check && npm run build-only
docker compose config
```

2026-08-14 梳理时，上述 Python/前端/dycast/Compose 配置检查均通过；前端和 dycast 构建有非 module script 警告，主前端有大包体警告。Docker 镜像构建因本机 daemon 未运行而未验证。

### 7.2 建议补充

- 后端：pytest + FastAPI TestClient/WebSocket 集成测试；
- 协议：JSON Schema 契约测试；
- 前端：Vitest + React Testing Library；
- E2E：Playwright 覆盖文字、拍照、录音、直播输出；
- 外部服务：使用 Mock Server，避免测试依赖真实计费 API；
- 负载：WebSocket 连接数、图片大小、音频时长、直播弹幕峰值。

## 8. 演进优先级

### P0：部署与安全

- 修正动态 WebSocket/TTS 地址；
- 完整配置 dycast 反向代理；
- 修正音频编码声明；
- 加认证、消息限制和密钥治理。

### P1：正确性与维护性

- 定义 Pydantic/TypeScript 共享协议；
- 拆分 `main.py`；
- 修复主动断开重连、client id 不一致和回调覆盖；
- 按客户端/直播间隔离并限制历史。

### P2：性能与扩展

- 合并对话/动作/拍照判断为一次结构化 LLM 输出；
- 引入任务队列处理 TTS/ASR；
- 共享会话存储与消息总线；
- 前端代码分包和资源 CDN。
