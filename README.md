# 小凡AI - 你的智能虚拟伴侣

> 工程交接文档：[架构文档](docs/ARCHITECTURE.md) · [设计文档](docs/DESIGN.md) · [前端重构设计](docs/FRONTEND_REDESIGN.md) · [协议文档](docs/PROTOCOL.md) · [部署文档](docs/DEPLOYMENT.md)

一个深度融合 Live2D 虚拟形象与 AI 对话引擎的智能陪伴系统。通过集成 OpenAI/智谱 AI 的自然语言理解、实时 WebSocket 通信、长期记忆、手势识别（MediaPipe）与 TTS 语音合成，打造可配置称呼、性格和虚拟人物的情感陪伴体验。

## 核心亮点

- 🪆 **生动Live2D形象**：基于 Cubism SDK 的虚拟角色，支持拖拽、缩放、动画联动，内置 8 款模型
- 🎛️ **可配置伴侣设定**：可在“隐私与设置”中配置 AI 伴侣称呼、性格和默认虚拟人物
- 👤 **实时选妃预览**：设置弹窗每次渲染一个真实 Live2D 人物，可点击“下一个”轮换并通过“点他”确认
- 🧠 **长期记忆管理**：支持当前关系状态、置顶记忆、自动记忆、待跟进事项、每日对话时间线和关系历史的读取与维护
- 🗣️ **智能对话与语音**：接入OpenAI/智谱AI API，具备上下文记忆、角色人格和 MCP 实时信息工具；集成EasyVoice TTS，实现文本转语音
- 👋 **“摸摸我”手势互动**：多模态聊天中通过 MediaPipe 同时识别左右手和人脸，小手碰触人物后随机播放 Live2D 动作，人物会看向真实人脸位置
- 🎭 **多模态交互体验**：支持文字、图片、音频、摄像头视觉和手势互动，动画与音频深度同步
- 🔧 **全栈技术集成**：前端React 19 + TypeScript 5.8 + Vite 6.3，后端FastAPI + LangChain，Docker化TTS服务
- 🎨 **现代化UI设计**：基于Ant Design 6的精美界面，响应式布局

## 场景应用

- 🎭 **情感陪伴与日常聊天**：作为知心朋友，提供温暖贴心的对话体验
- 📺 **虚拟主播/数字人互动**：可用于直播、视频制作等场景
- 🤖 **AI助手 + 虚拟形象融合实验**：探索AI与虚拟形象的结合应用
- 👋 **手势交互与动画控制技术演示**：展示 MediaPipe 与 Live2D 的深度集成，实现双手追踪、平滑映射、碰撞检测和随机动作
- 🎬 **抖音直播互动**：集成抖音弹幕捕获，实现数字人自动回复直播间评论

## 项目简介

小凡 AI 是一个集成了 Live2D 虚拟形象的智能对话系统，默认伴侣称呼可在设置中修改，具有以下特点：

- **Live2D虚拟形象**：使用 Live2D Cubism SDK 渲染虚拟角色，支持 8 款模型（Haru、Hiyori、Mao、Mark、Natori、Ren、Rice、Wanko）
- **伴侣设定**：称呼和性格均可在“隐私与设置”页面配置并持久化
- **人物选择**：虚拟人物统一在设置页选择，首页和聊天页固定展示已确认的人物
- **长期记忆**：支持按伴侣保存和管理当前关系状态、置顶、自动、待跟进、关系历史及每日对话时间线
- **AI智能对话**：支持OpenAI和智谱AI双引擎切换，具备自然语言理解能力
- **实时通信**：通过WebSocket实现前后端实时消息交互，支持自动重连
- **动画控制**：支持多种动画播放模式和音频联动，智能选择动画
- **打字机效果**：AI回复采用打字机效果逐字显示，支持完成回调
- **多模态消息**：支持文字、图片、音频等多种消息类型，消息历史记录最多保存100条
- **摄像头互动**：多模态聊天页提供“让我看看”和“摸摸我”，支持拍照分析、本地双手识别互动，以及开启“摸摸我”时的人脸视线跟随

## 技术架构

### 前端技术栈

- **框架**：TypeScript 5.8.3 + Vite 6.3.5
- **Live2D引擎**：Live2D Cubism SDK for Web（Core + Framework）
- **UI框架**：React 19.2.3 + Ant Design 6.2.2
- **手势与人脸识别**：MediaPipe Hands 0.4.1675469240 + MediaPipe Face Detection
- **通信协议**：WebSocket（自动重连机制）
- **音频处理**：Web Audio API（RMS值放大5.0倍实现口型同步）
- **状态管理**：React Hooks + localStorage持久化
- **代码规范**：ESLint 9.26.0 + Prettier 3.5.3
- **容器化部署**：Docker + Docker Compose

### 后端技术栈

- **框架**：FastAPI 0.104.0+ + Uvicorn 0.24.0+
- **AI模型**：
  - LangChain 0.1.0+ + OpenAI API（对话生成）
  - 智谱AI GLM-4V-Flash（图片分析）
  - 支持双引擎切换（MODEL_TYPE配置）
- **语音识别**：SiliconFlow SenseVoiceSmall
- **通信协议**：WebSocket 12.0+
- **MCP 工具**：内置轻量 stdio MCP Server，提供当前日期时间和实时天气查询能力
- **依赖管理**：pip + requirements.txt
- **TTS服务**：EasyVoice (Docker)
- **容器化部署**：Docker + Docker Compose
- **其他库**：httpx 0.25.0+, aiofiles 23.0.0+, Pillow 10.0.0+, emoji 2.15.0+, zhipuai 2.0.0+, numpy 1.24.0+

### 抖音直播采集技术栈

- **采集实现**：Python 后端内置抖音直播采集，不再依赖 dycast 独立前端/容器
- **房间解析**：`services/douyin_live/room.py` 通过抖音直播页解析 room_id、unique_id 和直播状态
- **签名生成**：`services/douyin_live/signature_browser.py` 使用 Playwright/Chromium 调用本地签名脚本生成 X-Bogus
- **消息解码**：`services/douyin_live/js_runtime/decode.js` 复用本地 JS 解码运行时解析 protobuf/gzip 消息
- **采集通道**：优先 WebSocket 连接抖音上游，失败时自动降级为 HTTP 轮询
- **事件分发**：后端通过本项目 `/ws/livestream_console_*` 和 `/ws/livestream_user_*` 推送事件与数字人回复

## 项目结构

```
CubismWebSamples/
├── BackendProject/              # 后端项目（FastAPI）
│   ├── main.py                 # FastAPI主程序
│   ├── requirements.txt        # Python依赖清单
│   ├── .env                    # 环境变量配置（需自行创建）
│   ├── .env.example            # 环境变量示例文件
│   ├── README.md               # 后端说明文档
│   ├── handlers/               # 消息处理器目录
│   │   ├── audio_handler.py    # 音频消息处理（语音识别）
│   │   └── image_handler.py    # 图片消息处理（GLM-4V分析）
│   ├── domain/                  # 领域服务（记忆、时间线、Prompt 构建等）
│   ├── repositories/            # 数据访问层（记忆、会话、时间线等）
│   ├── schemas/                 # 数据结构定义
│   ├── mcp_servers/             # 内置 MCP stdio server
│   │   └── realtime_server.py   # 当前日期时间与实时天气工具
│   ├── services/                # 服务层目录
│   │   ├── llm_service.py       # 大模型服务（OpenAI + 智谱AI双引擎）
│   │   ├── mcp_client.py        # MCP stdio 客户端
│   │   ├── realtime_context.py  # 按需调用 MCP 工具生成实时上下文
│   │   └── http_service.py      # HTTP服务（TTS生成 + 语音识别）
│   └── audio_files/             # 音频文件存储目录
├── audio/                      # TTS音频输出目录（Docker挂载点）
├── FrontendProject/
│   └── TypeScript/
│       └── AI/                 # 前端AI项目（React + TypeScript）
│           ├── src/
│           │   ├── main.tsx                # 应用入口文件
│           │   ├── App.tsx                 # 主应用组件
│           │   ├── config.ts               # 配置文件（后端地址、图片配置）
│           │   ├── websocketmanager.ts     # WebSocket管理器（自动重连）
│           │   ├── lappdelegate.ts         # 应用委托（生命周期管理）
│           │   ├── lapplive2dmanager.ts    # Live2D管理器（模型切换）
│           │   ├── lappmodel.ts            # Live2D模型（动画控制）
│           │   ├── lappaudiomanager.ts     # 音频管理器（口型同步）
│           │   ├── touchmanager.ts         # 触摸管理器（拖拽交互）
│           │   ├── lappview.ts             # 视图管理器（渲染控制）
│           │   ├── lappglmanager.ts        # WebGL上下文管理器
│           │   ├── lapptexturemanager.ts   # 纹理管理器
│           │   ├── lappwavfilehandler.ts   # WAV文件处理器
│           │   ├── lappsubdelegate.ts      # 子委托（移动端支持）
│           │   ├── lappdefine.ts           # 常量定义
│           │   ├── lapppal.ts              # 调色板管理
│           │   ├── lappsprite.ts           # 精灵管理
│           │   ├── components/             # React组件目录
│           │   │   ├── AudioControls.tsx       # 音频控制组件
│           │   │   ├── MotionControls.tsx      # 动画控制组件
│           │   │   ├── ZoomControls.tsx        # 缩放控制组件
│           │   │   ├── WebSocketPanel.tsx      # WebSocket状态面板
│           │   │   └── HandGestureControls.tsx # 手势控制组件
│           │   └── services/              # 服务层目录
│           │       └── HandGestureService.ts   # 手势识别服务（MediaPipe）
│           ├── public/
│           │   ├── Core/                   # Live2D Core库文件
│           │   ├── mediapipe/hands/        # 构建时复制的 MediaPipe Hands 本地运行资源
│           │   ├── mediapipe/face_detection/ # 构建时复制的 MediaPipe Face Detection 本地运行资源
│           │   └── Resources/              # 模型资源文件目录
│           │       ├── Haru/               # Haru模型
│           │       ├── Hiyori/             # Hiyori模型
│           │       ├── Mao/                # Mao模型
│           │       ├── Mark/               # Mark模型
│           │       ├── Natori/             # Natori模型
│           │       ├── Ren/                # Ren模型
│           │       ├── Rice/               # Rice模型
│           │       └── Wanko/              # Wanko模型
│           ├── index.html                  # 主页面入口
│           ├── mobile.html                 # 移动端页面入口
│           ├── package.json                # 项目配置和依赖
│           ├── vite.config.mts             # Vite构建配置
│           ├── tsconfig.json               # TypeScript配置
│           └── copy_resources.js          # 资源复制脚本
├── Core/                        # Live2D Cubism Core（Git子模块）
├── Framework/                   # Live2D Framework（Git子模块）
├── dycast/                      # 历史参考目录；当前运行时已改为 Python 后端采集，不参与 Compose 部署
├── .gitignore                   # Git忽略文件配置
├── .gitmodules                  # Git子模块配置
├── CHANGELOG.md                 # 项目更新日志
├── LICENSE.md                   # 许可证文件
├── NOTICE.md                    # 注意事项
└── README.md                    # 本说明文档
```

## 功能特性

### 1. Live2D虚拟形象

- **多模型支持**：内置 8 款 Live2D 模型（Haru、Hiyori、Mao、Mark、Natori、Ren、Rice、Wanko）
- **统一人物设置**：人物切换入口已从首页和聊天页移至“隐私与设置”
- **实时单人物预览**：“选妃”弹窗直接渲染真实 Live2D 人物，每次只展示一位
- **轮换确认**：点击“下一个”循环预览人物，点击“点他”保存选择
- **选择持久化**：确认后首页和聊天页持续显示同一虚拟人物
- **交互功能**：支持鼠标拖拽、鼠标视线跟随、缩放控制（0.5x - 2.0x）、触摸交互
- **动画系统**：多种动画效果（待机动画、随机动画、说话动画），支持循环播放
- **音频联动**：音频播放时自动停止动画，停止后恢复待机动画
- **“摸摸我”手势与人脸控制**：入口位于多模态聊天页“让我看看”按钮旁，开启后通过 MediaPipe 同时识别左右手和人脸；人脸识别会接管视线跟随，关闭后恢复鼠标跟随
- **左右手映射**：检测到左手时在人物左侧显示左手，检测到右手时在人物右侧显示右手，并随真实手部位置平滑移动
- **触碰随机动作**：小手与人物碰撞区域接触后，从 `TapBody` 和 `Idle` 动作中随机播放一次，播放完成后回到自然状态
- **本地模型资源**：MediaPipe Hands 与 Face Detection 的 WASM、TFLite 和运行文件随前端构建复制到 `/mediapipe/hands/`、`/mediapipe/face_detection/`，不依赖运行时外部 CDN
- **口型同步**：RMS值放大5.0倍，通过ParamMouthOpenY参数实现精确口型同步

### 2. AI对话功能

- **双引擎支持**：支持OpenAI和智谱AI双引擎切换（通过MODEL_TYPE配置）
- **自然语言理解**：基于LangChain框架，具备强大的对话能力
- **上下文与长期记忆**：保持多轮对话连续性，并按用户和伴侣保存长期记忆；Prompt 会注入按天整理的对话时间线
- **角色设定**：伴侣称呼和性格可在“隐私与设置”页面配置，不再固定为“小凡”
- **多客户端管理**：每个客户端独立会话，互不干扰
- **智能动画选择**：根据对话氛围自动选择合适的Live2D动画
- **多模态输入**：支持文字、图片、语音三种输入方式
- **图片分析**：集成智谱AI GLM-4V-Flash模型，支持图片内容分析与描述
- **自动拍照**：支持前端拍照指令，自动捕获画面并发送给AI分析
- **实时信息工具**：通过内置 MCP Server 获取当前日期、时间、星期；当用户询问天气时，按城市查询实时天气，未指定城市时使用 `DEFAULT_WEATHER_LOCATION`（默认上海）

### 3. 隐私、设置与记忆

- **伴侣称呼**：在设置页修改 AI 伴侣称呼并持久化
- **伴侣性格**：支持自定义性格描述，后续对话使用已保存设定
- **虚拟人物**：通过“选妃”弹窗预览、轮换并确认 Live2D 人物
- **当前关系状态与置顶记忆**：记忆管理页将当前关系状态和用户手动维护的置顶记忆合并展示，减少信息分散
- **自动记忆**：展示系统从对话中提取的长期信息
- **待跟进事项与完成记录**：活跃待跟进和已完成跟进记录合并在同一卡片中，支持完成、恢复、编辑和删除
- **关系阶段统计与关系历史**：展示当前阶段、最近 7 天趋势、累计分布和被替代的关系状态记录
- **每日对话时间线**：按天汇总会话摘要，并合并当天重要事件、待跟进和关系变化作为重点 highlights
- **记忆接口**：后端提供 `GET/POST /api/memories` 与 `PATCH/DELETE /api/memories/{memory_id}`
- **时间线接口**：后端提供 `GET /api/timeline-days` 用于每日总结，`GET /api/timeline-events` 用于原始时间线事件

### 4. WebSocket实时通信

- **自动重连机制**：连接断开后自动重连（最多5次，间隔3秒）
- **多消息类型**：支持文字、图片、音频、控制指令等多种消息类型
- **实时状态显示**：连接中（橙色）、已连接（绿色）、断开/错误（红色）
- **消息历史记录**：最多保存100条消息，支持时间戳格式化显示
- **音频流处理**：支持实时音频流传输和语音识别（PCM格式）
- **消息格式**：JSON格式，包含clientId、message、modelName、isAudio、should_take_photo等字段
- **图片消息音频**：支持图片消息转语音功能，可配置音频开关

### 5. 动画控制系统

- **循环播放**：支持循环播放随机动画或指定动画序号
- **动画选择**：通过playMotionByNo()方法播放预设动画索引
- **状态管理**：通过_isMotionEnabled标志管理动画播放状态
- **音频联动**：音频播放时自动停止动画，停止后恢复待机动画（restartIdleMotion）
- **说话动画**：支持说话相关动画（如haru_g_m01），与TTS语音同步
- **循环实现**：通过时间计算(time -= duration)和状态重置(updateForNextLoop)实现循环播放
- **配置驱动**：动画循环由motion3.json配置文件中的Loop字段控制
- **动画切换事件**：新增动画切换事件机制，支持动态切换动画索引

### 6. 音频管理

- **本地音频上传**：支持上传本地音频文件（MP3、WAV等格式）
- **播放控制**：音频播放/停止控制，状态实时显示
- **动画集成**：与动画系统深度集成，音频播放时自动联动动画
- **数据加载**：支持从ArrayBuffer加载音频数据
- **口型同步**：RMS值放大5.0倍，通过ParamMouthOpenY参数实现精确口型同步
- **TTS集成**：集成EasyVoice TTS服务，支持文本转语音（Docker部署）
- **语音识别**：集成SiliconFlow SenseVoiceSmall，支持语音转文字（WAV格式）
- **音频流处理**：支持实时音频流传输，格式为PCM，包含sample_rate、channels等参数
- **图片音频**：支持图片消息转语音功能，可配置音频开关

### 7. 抖音直播互动

- **内置直播控制台**：访问 `http://localhost/live/console`，在页面内输入抖音直播间房间号并点击“连接直播间”，后端会直接采集直播事件。
- **布局比例**：抖音直播模式下，左侧虚拟人区域与右侧直播互动区域按 `1:3` 宽度展示，便于查看实时事件和自动回复策略。
- **弹幕捕获**：后端 Python 服务直接采集抖音直播间弹幕，当前运行链路不再启动 dycast 独立页面或容器。
- **事件同步**：实时事件会先推送到控制台列表，再后台处理 AI/TTS，避免自动回复耗时导致“实时事件”不显示。
- **评论推送**：通过 WebSocket 向控制台和直播舞台推送直播事件批次（`livestream.event_batch`）。
- **采集降级**：如果抖音上游拒绝 WebSocket 握手并返回 `HTTP 200`，后端会自动切换到 `HTTP 轮询` 方式继续拉取事件。
- **AI自动回复**：数字人自动分析评论内容并生成智能回复。
- **TTS语音合成**：将 AI 回复转换为语音，通过 Live2D 模型口型同步播放。
- **实时互动**：支持批量处理多条评论，逐条生成回复和语音。
- **直播页面**：提供纯净的 OBS 舞台页面，仅显示 Live2D 模型和消息泡泡。
- **消息过滤**：自动过滤 WebcastChatMessage 类型的消息作为实际评论内容。
- **客户端标识**：控制台使用 `livestream_console_` 前缀，OBS 舞台/直播输出使用 `livestream_user_` 前缀。
- **提示层级**：直播控制台 Toast/Message 层级已提升，连接直播间、启动失败等提示不会被 Live2D 舞台或面板遮挡。
- **Docker部署**：支持通过 Docker Compose 一键部署前端、后端、Nginx 和 TTS；抖音采集能力包含在后端容器中。
- **统一访问与代理**：前端统一从 `http://localhost/live/console` 操作直播采集；Nginx 只需要代理本项目 `/api/` 和 `/ws/`。

## 快速开始

### 环境要求

- **Node.js**: 20.19.5+ / 22.20.0+ / 24.10.0+
- **Python**: 3.8+
- **Docker**: 用于运行前端、后端、Nginx 和 EasyVoice TTS 服务（如需语音功能则必须）
- **浏览器**: 支持WebGL的现代浏览器（推荐Chrome、Edge、Firefox最新版）
- **摄像头**: 如需使用手势控制功能

### Docker Compose 一键部署（推荐）

```bash
# 克隆项目并初始化子模块
git clone --recurse-submodules https://github.com/ptghb/virtual-person.git
cd virtual-person

# 配置环境变量
cp BackendProject/.env.example BackendProject/.env
# 编辑 BackendProject/.env 填入你的 API 密钥

# 首次构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

服务启动后访问：
- 前端服务：http://localhost（或 http://localhost:80）
- 多模态聊天：http://localhost/advanced
- 抖音直播控制台：http://localhost/live/console
- OBS 直播舞台：http://localhost/live/stage
- 后端服务：http://localhost:8000
- TTS服务：http://localhost:3000
- 抖音直播控制台通过后端 Python 直接采集，无需 dycast 地址或转发地址

> 💡 提示：Nginx 监听 80 端口作为统一入口，直接服务 `FrontendProject/TypeScript/AI/dist` 静态产物；前端开发容器仍可保留用于构建/预览，但本地访问入口以 Nginx 挂载的 `dist` 为准。
>
> 本地部署会将 `BackendProject` 挂载到后端容器的 `/app`，修改后端源码后重新创建后端容器即可加载最新接口：
>
> ```bash
> docker compose up -d --no-build --force-recreate backend nginx
> ```
>
> Nginx 会保留 `/api` 路径前缀转发到 FastAPI，例如浏览器请求 `/api/memories` 时，后端收到的仍是 `/api/memories`。
>
> 直播控制台刷新时，Live2D Core 固定从 `/Core/live2dcubismcore.js` 加载；Nginx 也兼容 `/live/Core/*` 历史路径。
>
> 抖音直播采集已重构到 Python 后端，Docker Compose 不再启动 dycast，也不再需要 `/dycast/`、`/dylive/`、`/socket/` 代理。

### 后端部署

1. 进入后端项目目录：
```bash
cd BackendProject
```

2. 安装Python依赖：
```bash
pip install -r requirements.txt
```

3. 配置环境变量（复制`.env.example`为`.env`并编辑）：
```env
# OpenAI API 配置
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# SiliconFlow 语音识别API配置
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# 智谱AI GLM-4V API配置（图片分析）
ZHIPUAI_API_KEY=your_zhipuai_api_key_here

# 模型类型配置: zhipu 或 openai
MODEL_TYPE=zhipu

# TTS服务配置
TTS_API_URL=http://localhost:3000
ISAUDIO=True  # 是否启用TTS语音合成
```

4. 启动后端服务：
```bash
python main.py
```

后端服务将在 `http://localhost:8000` 启动

### 前端部署

1. 进入前端项目目录：
```bash
cd FrontendProject/TypeScript/AI
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run start
```

前端服务将在 `http://localhost:8080` 启动，自动复制资源文件并启动Vite开发服务器。

4. 构建生产版本：
```bash
npm run build:prod
```

构建产物将输出到 `dist` 目录

### 部署生产环境

```bash
# 构建生产版本
npm run build:prod

# 预览生产构建
npm run serve
```

预览服务将在 `http://localhost:8080` 启动。

### 启动TTS服务（可选，如需语音功能）

```bash
# 确保Docker已安装并运行
docker --version

# 启动EasyVoice TTS服务
docker run -d -p 3000:3000 -v "$(pwd)/audio:/app/audio" cosincox/easyvoice:latest

# 检查容器状态
docker ps
```

> ⚠️ 注意：TTS服务端口3000不能被占用，audio目录需要有写入权限。

### 启动抖音直播采集（Python 后端）

抖音直播采集已内置在后端服务中，使用 Docker Compose 启动 `backend` 后即可使用，无需单独启动 dycast：

```bash
# 启动/重建后端、前端和 Nginx
docker compose up -d --build backend frontend nginx

# 查看采集状态
curl http://localhost/api/livestream/douyin/status
```

使用方式：访问 http://localhost/live/console，输入抖音直播间房间号，点击“连接直播间”。

## 使用说明

### 基本操作

1. **连接服务器**：页面加载后会自动连接到WebSocket服务器
2. **发送消息**：在左侧消息输入框输入文字，点击"发送"或按回车键
3. **查看回复**：AI回复会以打字机效果逐字显示，同时触发随机动画

### 音频控制

1. **上传音频**：点击"上传音频文件"按钮选择本地音频文件
2. **播放音频**：点击"播放音频"按钮开始播放
3. **停止音频**：点击"停止音频"按钮停止播放

### 动画控制

1. **循环播放随机动画**：点击"循环播放随机动画"按钮切换动画状态
2. **播放指定动画**：在下拉框选择动画序号，点击"循环播放指定动画"按钮
3. **缩放控制**：使用滑块调整模型大小（0.5x - 2.0x）

### “摸摸我”手势互动

1. 访问多模态聊天页 `http://localhost/advanced`
2. 在“让我看看”按钮旁点击“摸摸我”
3. 浏览器请求摄像头权限时选择允许
4. 将脸保持在摄像头画面中：
   - 预览状态会显示“寻找人脸中”或“已锁定人脸”
   - 识别到人脸后，预览画面会绘制绿色人脸框
   - 虚拟人物会根据人脸在摄像头画面中的位置调整眼球、头部和身体朝向
   - 开启“摸摸我”期间，鼠标视线跟随会暂停，避免鼠标与人脸识别同时控制人物视线
5. 将左手或右手伸到镜头前：
   - 检测到左手时，人物左侧出现“左手”小手
   - 检测到右手时，人物右侧出现“右手”小手
   - 同时伸出双手时，两只小手可以同时显示
   - 摄像头检测到手部移动后，屏幕小手会经过平滑处理同步移动
6. 将小手移动到虚拟人物上，命中模型碰撞区域后会随机播放一次 `TapBody` 或 `Idle` 动作
7. 点击“结束摸摸”可停止识别并关闭摄像头；虚拟人物视线会回正并恢复鼠标跟随

技术实现：

- 鼠标未按下时会通过指针位置驱动 Live2D `ParamAngleX/Y/Z`、`ParamBodyAngleX` 和 `ParamEyeBallX/Y`，实现常规视线跟随
- 使用 MediaPipe Hands 跟踪食指指尖坐标，但无需保持特定手势即可显示小手
- 使用 MediaPipe Face Detection 跟踪人脸中心点；“摸摸我”开启后由人脸位置驱动 Live2D 视线，关闭后恢复鼠标指针驱动
- 将左右手分别映射到人物舞台左右区域，并对坐标进行线性插值以减少抖动
- 对小手中心和周边多个位置进行碰撞采样，降低人物边缘漏判
- 触碰采用进入触发和冷却控制，避免持续接触时高频重复播放
- 动作启动时显式开启 Live2D MotionManager 更新，播放完成后自动停止
- MediaPipe 运行资源由 `copy_resources.js` 从依赖复制到前端静态目录并由本地服务加载，包括 `/mediapipe/hands/` 和 `/mediapipe/face_detection/`

> 注意：手势互动需要在 `localhost` 或 HTTPS 环境运行，并允许浏览器摄像头权限；模型需要在 `model3.json` 中配置碰撞区域。

### 图片识别（新增）

1. **上传图片**：在聊天界面发送图片消息
2. **自动分析**：后端使用GLM-4V-Flash模型分析图片内容
3. **智能回复**：AI根据图片内容生成描述性回复
4. **支持格式**：JPEG、PNG、GIF、WEBP（最大5MB）
5. **图片音频**：支持将图片分析结果转换为语音播放（可配置开关）

### 语音输入（新增）

1. **开始录音**：点击"开始录音"按钮启动音频流
2. **实时传输**：音频数据实时传输到后端进行识别
3. **停止录音**：点击"停止录音"按钮结束录音
4. **自动对话**：识别结果自动发送给AI进行对话
5. **移动端支持**：移动端页面支持语音录音功能，录音时按钮显示红色背景与脉冲动画效果
6. **音频配置**：支持16kHz采样率、单声道、回声消除、噪声抑制等音频参数配置

### 抖音直播互动（新增）

1. **打开直播控制台**：访问 http://localhost/live/console。
2. **连接直播间**：输入抖音直播间房间号，点击“连接直播间”。
3. **查看实时事件**：左侧虚拟人区域与右侧直播互动区域按 `1:3` 展示；右侧“实时事件”会立即显示进入、评论、关注、点赞等事件。
4. **控制自动回复**：可在“自动回复策略”中开关评论、进入、关注、点赞自动互动。
5. **打开 OBS 舞台**：点击“打开 OBS 舞台”或访问 `/live/stage`，用于直播推流画面。
6. **AI智能回复**：数字人自动分析评论并生成回复；回复内容可通过 TTS 转换为语音并驱动口型同步。
7. **采集状态提示**：如果抖音 WebSocket 被上游拒绝，页面会显示采集提示，后端会降级为 HTTP 轮询。
8. **无需 dycast**：采集链路已重构为 Python 后端直接采集，不需要打开 `/dycast/` 或配置转发地址。

### WebSocket状态

- **绿色圆点**：已连接
- **橙色圆点**：连接中
- **红色圆点**：断开或错误

## 配置说明

### WebSocket服务器地址

在 `src/config.ts` 中修改WebSocket服务器地址：

```typescript
export const BACKEND_CONFIG = {
  WS_URL: 'ws://your-server:8000',
  API_BASE_URL: 'http://your-server:8000',
  TTS_ENDPOINT: '/api/v1/tts/generate'
} as const;
```

### AI角色设定

伴侣称呼和性格不再固定写在后端代码中。打开：

1. 访问 `http://localhost/settings`
2. 在“伴侣设定”中修改称呼和性格
3. 保存后，设定会持久化并用于后续对话

虚拟人物也在同一设置页配置：

1. 点击“选择人物”打开“选妃”弹窗
2. 弹窗每次显示一个真实 Live2D 人物
3. 点击“下一个”切换人物
4. 点击“点他”确认，首页和聊天页将固定显示该人物

### 模型类型配置

通过 `MODEL_TYPE` 环境变量切换AI引擎：

```env
# 使用智谱AI（推荐，支持图片分析）
MODEL_TYPE=zhipu

# 使用OpenAI（仅支持文字对话）
MODEL_TYPE=openai
```

### Live2D模型配置

模型文件位于 `public/Resources/` 目录，当前支持 8 款模型：
- Haru：支持 Body 碰撞区域，适合手势交互
- Hiyori：支持 Body 碰撞区域及 10 个可随机选择的 `Idle`/`TapBody` 动作
- Mao：支持完整的肘部关节控制
- Mark、Natori、Ren、Rice、Wanko：各具特色的官方模型

支持替换为其他Live2D模型，只需将模型文件放入对应目录即可。

> 注意：手势交互功能需要模型支持碰撞区域，未配置 `HitAreas` 的自定义模型无法触发碰触动作。

### TTS服务配置

TTS服务使用Docker容器运行，配置说明：

- **镜像**：cosincox/easyvoice:latest
- **端口映射**：3000:3000
- **目录挂载**：`$(pwd)/audio:/app/audio` - TTS生成的音频文件将保存在项目根目录的audio文件夹中
- **服务地址**：http://localhost:3000
- **环境变量**：ISAUDIO=True（启用TTS功能）

```bash
# 启动EasyVoice TTS服务
docker run -d -p 3000:3000 -v "$(pwd)/audio:/app/audio" cosincox/easyvoice:latest
```

如需修改TTS服务配置，请编辑后端代码中的TTS API调用部分（`services/http_service.py`）。

### 抖音直播采集配置

当前抖音直播采集由 Python 后端负责，核心文件：

- `BackendProject/services/douyin_live/client.py`：抖音上游 WebSocket 连接、HTTP 轮询降级、心跳与事件回调
- `BackendProject/services/douyin_live/manager.py`：采集任务生命周期与状态管理
- `BackendProject/services/douyin_live/room.py`：直播间页面解析与直播状态识别
- `BackendProject/services/douyin_live/signature_browser.py`：Playwright/Chromium 签名生成
- `BackendProject/services/douyin_live/js_runtime/decode.js`：protobuf/gzip 消息解码
- `BackendProject/main.py`：`/api/livestream/douyin/*` 控制接口、`/api/livestream/events` 事件入口、`/ws/*` 广播通道

接口说明：

```bash
# 启动抖音直播采集
curl -X POST http://localhost/api/livestream/douyin/start \
  -H 'Content-Type: application/json' \
  -d '{"room_num":"直播间房间号"}'

# 查询采集状态
curl http://localhost/api/livestream/douyin/status

# 停止采集
curl -X POST http://localhost/api/livestream/douyin/stop -H 'Content-Type: application/json' -d '{}'
```

说明：

1. 不需要访问 `/dycast/`，也不需要配置 dycast 转发地址。
2. 控制台 WebSocket 使用 `/ws/livestream_console_*` 接收 `livestream.event_batch` 和 `livestream.douyin_status`。
3. OBS 舞台/直播输出使用 `/ws/livestream_user_*` 接收数字人回复。
4. 如果抖音上游 WebSocket 返回 `HTTP 200` 拒绝握手，后端会自动切换为 `HTTP 轮询`。

## 开发指南

### 前端开发

- **入口文件**：`src/main.tsx` - 应用启动入口
- **主应用组件**：`src/App.tsx` - 主应用逻辑和UI布局
- **配置文件**：`src/config.ts` - 后端地址、图片配置等常量
- **WebSocket管理**：`src/websocketmanager.ts` - WebSocket连接和消息处理
- **Live2D管理**：`src/lapplive2dmanager.ts` - Live2D模型管理和切换
- **模型管理**：`src/lappmodel.ts` - 单个模型的动画和参数控制
- **音频管理**：`src/lappaudiomanager.ts` - 音频播放和口型同步
- **触摸管理**：`src/touchmanager.ts` - 鼠标/触摸交互处理
- **视图管理**：`src/lappview.ts` - 渲染视图和坐标转换
- **手势/人脸识别服务**：`src/services/HandGestureService.ts` - MediaPipe 双手识别、人脸识别、真实左右手校正、食指指尖坐标和人脸中心点输出
- **手势控制组件**：`src/components/HandGestureControls.tsx` - “摸摸我”按钮、摄像头预览、人脸注视、左右手映射、平滑移动和碰撞触发
- **虚拟人物服务**：`src/services/avatar.service.ts` - 前端组件调用 Live2D 的统一入口，包含语音播放、触摸动作、鼠标跟随暂停和人脸视线坐标下发
- **React组件**：`src/components/` - UI组件目录

### 后端开发

- **主程序**：`BackendProject/main.py` - FastAPI应用入口和路由定义
- **消息处理器**：`BackendProject/handlers/`
  - `audio_handler.py`：音频消息处理、语音识别（SiliconFlow）
  - `image_handler.py`：图片消息处理、GLM-4V分析（智谱AI）
- **服务层**：`BackendProject/services/`
  - `llm_service.py`：大模型服务（OpenAI对话、智谱AI图片分析、动画选择、双引擎切换）
  - `http_service.py`：HTTP服务（TTS生成、语音识别API调用）

### 代码规范

- **TypeScript**：严格类型检查，使用`tsc --noEmit`进行类型检查
- **ESLint**：遵循ESLint 9.26.0代码规范，使用`npm run lint`检查代码质量
- **Prettier**：使用Prettier 3.5.3格式化代码，使用`npm run lint:fix`自动修复问题
- **React组件**：使用函数式组件和Hooks，避免类组件
- **日志规范**：使用console.log进行调试日志输出，日志前缀使用方括号标注模块名称，如`[WebSocketManager]`

### Docker部署

项目支持Docker Compose一键部署，配置文件位于项目根目录：

- **docker-compose.yml**：多服务编排配置
- **FrontendProject/TypeScript/AI/Dockerfile**：前端多阶段构建配置
- **BackendProject/Dockerfile**：后端Python服务配置
- **nginx/nginx.conf**：Nginx反向代理配置

部署方式详见「Docker Compose 一键部署」章节。

## 常见问题

### 1. WebSocket连接失败

- 检查后端服务是否启动
- 确认WebSocket服务器地址配置正确（`src/config.ts`）
- 查看浏览器控制台错误信息
- 检查防火墙设置是否阻止了WebSocket连接

### 2. Live2D模型不显示

- 确认已执行 `npm run dev` 或 `npm start`（会自动复制资源文件）
- 检查 `public/Resources/` 目录下是否有模型文件（Haru、Hiyori、Mao等）
- 查看浏览器控制台是否有资源加载错误（404错误等）
- 确认浏览器支持WebGL，访问 `chrome://gpu` 检查GPU加速状态

### 3. AI回复异常

- 检查 `.env` 文件中的API配置是否正确（OPENAI_API_KEY、ZHIPUAI_API_KEY等）
- 确认API密钥有效且有足够的配额
- 检查MODEL_TYPE配置是否正确（zhipu或openai）
- 查看后端日志输出，确认是否有错误信息
- 尝试切换不同的AI引擎进行测试

### 4. 音频无法播放

- 确认音频文件格式支持（MP3、WAV等）
- 检查浏览器是否允许自动播放（可能需要用户交互后才能播放）
- 查看浏览器控制台错误信息（CORS、MIME类型等）
- 确认TTS Docker容器是否正常运行：`docker ps`
- 检查audio目录是否存在且有写入权限：`ls -la audio/`
- 确认环境变量`ISAUDIO`设置为`True`

### 5. 手势控制不生效

- 确认是在多模态聊天页点击“让我看看”旁边的“摸摸我”
- 确认已允许浏览器访问摄像头权限（HTTPS或localhost环境）
- 检查当前使用的Live2D模型是否支持碰撞区域：
  - Haru模型：支持 Body 碰撞区域
  - 其他模型：支持程度可能不同，请查看模型文档
- 查看浏览器控制台是否有MediaPipe相关错误（摄像头权限、模型加载等）
- 确认摄像头设备正常工作
- 检查 `/mediapipe/hands/hands.js`、WASM 和 TFLite 文件是否能够正常返回 HTTP 200
- 如果人物没有看向人脸，先确认摄像头预览是否显示“已锁定人脸”并出现绿色人脸框
- 检查 `/mediapipe/face_detection/face_detection.js`、WASM、TFLite 和 binarypb 文件是否能够正常返回 HTTP 200
- 开启“摸摸我”期间鼠标视线跟随会暂停，这是预期行为；点击“结束摸摸”后才会恢复鼠标跟随
- 如果小手光标不显示，请将整只手放入摄像头画面并保持光线充足
- 如果小手光标不跟随手指移动，检查坐标映射是否正确
- 如果小手已经碰到人物但没有动作，检查模型是否包含 `Idle` 或 `TapBody` 动作以及 `HitAreas` 配置

### 6. TTS服务无法使用

- 确认Docker已安装并运行：`docker --version`
- 检查TTS容器是否启动：`docker ps | grep easyvoice`
- 查看容器日志：`docker logs <container_id>`
- 确认端口3000未被占用：`lsof -i :3000` 或 `netstat -an | grep 3000`
- 检查audio目录是否存在且有写入权限：`ls -la audio/`
- 确认环境变量`ISAUDIO`设置为`True`
- 测试TTS服务是否可访问：`curl http://localhost:3000`

### 7. Docker Compose 部署问题

- 确认 Docker 和 Docker Compose 已安装：`docker --version` 和 `docker compose version`
- 检查端口是否被占用：80（Nginx入口）、8000（后端）、3000（TTS）
- 查看服务状态：`docker compose ps`
- 查看服务日志：`docker compose logs -f <service_name>`
- 确认环境变量已正确配置在 `BackendProject/.env` 文件中
- 检查Git子模块是否已初始化：`git submodule status`
- 如需重新构建镜像：`docker compose build --no-cache`
- 前端服务通过 Nginx 反向代理访问，请访问 http://localhost 而非 8080 端口

### 8. 图片识别功能不工作

- 确认已配置`ZHIPUAI_API_KEY`环境变量且有效
- 检查智谱AI API密钥是否有足够的配额和权限
- 查看后端日志中的GLM-4V调用错误信息（网络超时、认证失败等）
- 确认图片格式支持（JPEG、PNG、GIF、WEBP）
- 检查图片大小是否超过5MB限制（IMAGE_CONFIG.MAX_FILE_SIZE）
- 测试智谱AI API是否可访问
- 确认 `MODEL_TYPE` 设置为 `zhipu`

### 9. 语音识别功能不工作

- 确认已配置`SILICONFLOW_API_KEY`环境变量且有效
- 检查SiliconFlow API密钥是否有足够的配额和权限
- 查看后端日志中的语音识别错误信息（网络超时、认证失败等）
- 确认音频文件格式为WAV（PCM编码）
- 检查`audio_files`目录是否存在且有写入权限：`ls -la BackendProject/audio_files/`
- 测试SiliconFlow API是否可访问

### 10. 示例环境限制（https://xiaofan.laogeworld.cn）

⚠️ 注意事项：
- 此环境没有部署TTS服务，不支持开启语音功能（ISAUDIO=False）
- 如需体验以上功能，请自行部署完整环境
- 建议使用 Docker Compose 一键部署完整环境

### 11. 抖音直播互动配置

- **推荐入口**：使用内置控制台 `http://localhost/live/console`，无需 dycast 或手动配置转发地址。
- **后端采集**：`POST /api/livestream/douyin/start` 启动抖音直播采集，`GET /api/livestream/douyin/status` 查看状态，`POST /api/livestream/douyin/stop` 停止采集。
- **事件入口**：`POST /api/livestream/events` 接收直播事件批次；接口会先广播事件到控制台，再后台执行 AI 自动回复。
- **采集降级**：抖音 WebSocket 握手失败并返回 `HTTP 200` 时，后端会自动切换到 `HTTP 轮询`，状态中会显示 `transport: http-polling`。
- **评论处理**：后端会自动处理 WebcastChatMessage 类型的评论消息，也可按策略处理进入、关注、点赞事件。
- **TTS依赖**：如需直播回复语音，需启用 TTS 服务（`ISAUDIO=True`）。
- **客户端标识**：控制台使用 `livestream_console_` 前缀，直播舞台/输出端使用 `livestream_user_` 前缀。
- **dycast 状态**：当前运行时已去掉 dycast 独立服务；如果仓库中仍有 `dycast/` 目录，仅作为历史参考，不参与 Docker Compose 部署。

### 12. 隐私与设置页面的记忆接口返回 404

- 确认 Nginx 的 `/api/` 代理保留路径前缀：`proxy_pass http://backend:8000;`
- 确认后端已加载 `/api/memories` 路由：访问 `http://localhost:8000/openapi.json`
- 本地源码更新后重新创建后端与 Nginx：

```bash
docker compose up -d --no-build --force-recreate backend nginx
```

- 验证接口：`curl "http://localhost/api/memories?user_id=test&companion_id=Hiyori&status=active&limit=50"`

### 13. `/live/console` 刷新后请求 `/live/Core/live2dcubismcore.js` 404

- 前端入口应使用绝对路径：`/Core/live2dcubismcore.js`，不要使用 `./Core/live2dcubismcore.js`。
- Nginx 已提供 `/live/Core/` 到 `/Core/` 的兼容代理；如仍 404，请重启 Nginx 并清理浏览器缓存。
- 验证：`curl -I http://localhost/Core/live2dcubismcore.js` 应返回 `200` 且 Content-Type 为 JavaScript。

### 14. 访问 `/dycast/` 或 `/dylive/...` 不可用

- 当前版本已去掉 dycast 独立服务，抖音直播采集重构为 Python 后端直接采集。
- Docker Compose 不应包含 `dycast` 服务，Nginx 也不需要 `/dycast/`、`/dylive/`、`/socket/` 代理。
- 正确入口是 `http://localhost/live/console`。
- 如仍看到 `cubism_dycast` 容器，说明是历史遗留容器，可执行：`docker rm -f cubism_dycast`。

### 16. 抖音直播连接报 `server rejected WebSocket connection: HTTP 200`

- 这是抖音上游拒绝 WebSocket 握手的表现，不是本项目 `/ws/` 代理异常。
- 当前后端会自动切换为 `HTTP 轮询` 继续拉取直播事件；可通过 `GET /api/livestream/douyin/status` 查看 `transport` 和 `last_error`。
- 如果直播间未开播，状态会显示“主播尚未开播或已下播”，实时事件列表不会新增内容。

### 17. 直播控制台“实时事件”没有显示

- 确认控制台 WebSocket 已连接：浏览器网络面板中 `/ws/livestream_console_*` 应返回 `101 Switching Protocols`。
- 验证事件广播链路：向 `/api/livestream/events` POST 一条测试事件后，控制台应收到 `livestream.event_batch` 并显示在“实时事件”。
- 当前实现会先广播事件、再后台处理 AI/TTS，避免自动回复耗时导致列表不刷新。
- 如果状态为未开播或采集错误，则不会产生真实直播间事件；请确认房间号正确且主播正在直播。

## 许可证

本项目基于Live2D Open Software License。使用前请阅读 [LICENSE.md](LICENSE.md)。

## 相关链接

### 官方文档
- [Live2D Cubism SDK Manual](https://docs.live2d.com/cubism-sdk-manual/top/) - Live2D开发文档
- [Live2D Cubism SDK下载](https://www.live2d.com/download/cubism-sdk/download-web/) - SDK下载地址
- [FastAPI文档](https://fastapi.tiangolo.com/) - FastAPI官方文档
- [LangChain文档](https://python.langchain.com/) - LangChain框架文档
- [MediaPipe Hands文档](https://google.github.io/mediapipe/solutions/hands.html) - 手势识别文档
- [React文档](https://react.dev/) - React官方文档
- [Ant Design文档](https://ant.design/) - Ant Design组件库文档
- [Vite文档](https://vitejs.dev/) - Vite构建工具文档
- [TypeScript文档](https://www.typescriptlang.org/) - TypeScript官方文档

### 第三方服务
- [EasyVoice TTS](https://github.com/cosincox/easyvoice) - TTS语音合成服务
- [OpenAI API](https://platform.openai.com/docs) - OpenAI API文档
- [智谱AI GLM-4V](https://open.bigmodel.cn/dev/api#glm-4v) - 智谱AI视觉模型文档
- [SiliconFlow](https://siliconflow.cn/) - SiliconFlow语音识别服务
- Python 后端抖音直播采集 - 本项目内置直播间解析、签名、消息解码和事件广播

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解项目更新历史。

### 最新更新亮点

- 👋 “摸摸我”双手互动：入口位于“让我看看”旁，左右手分别显示并跟随移动
- 🎬 触碰随机动作：碰到人物后随机播放一次 `TapBody` 或 `Idle` 动作
- 🎯 碰撞检测增强：对小手中心及周边多点采样，减少人物边缘漏判
- 📦 MediaPipe 本地化：WASM、TFLite 等资源随前端构建复制并从本地加载
- 🎛️ 伴侣设定可配置：称呼和性格不再固定为“小凡”
- 👤 Live2D 选妃弹窗：真实渲染单个人物，支持“下一个”和“点他”
- 🧠 长期记忆管理：支持置顶、自动、待办和关系历史
- 🔧 API 转发修复：Nginx 保留 `/api` 前缀，修复设置页记忆请求 404
- 🐳 本地部署优化：后端容器直接挂载最新源码
- 🎤 移动端语音录音：实现移动端语音录音与实时传输功能
- 🎙️ MediaRecorder集成：支持麦克风录音及WebSocket推流
- 🎵 音频参数配置：16kHz采样率、单声道、回声消除、噪声抑制
- ✨ 支持OpenAI和智谱AI双引擎切换
- 🎭 支持 8 款 Live2D 模型
- 📱 改进移动端支持和响应式布局
- 🔧 优化WebSocket自动重连机制
- 🎨 升级到React 19和Ant Design 6
- 🎬 抖音直播互动：Python 后端直接采集抖音直播间事件并自动回复
- 💬 实时弹幕捕获：支持捕获抖音直播间评论并推送到数字人
- 🤖 AI智能回复：数字人自动分析评论并生成语音回复
- 🎙️ ASR 独立配置：语音识别使用 `ASR_BASE_URL` / `ASR_MODEL`，不再和对话生成共用 `OPENAI_BASE_URL`

## 贡献指南

欢迎提交Issue和Pull Request来改进本项目！

### 贡献流程
1. Fork本仓库到你的GitHub账号
2. 创建特性分支：`git checkout -b feature/your-feature-name`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/your-feature-name`
5. 提交Pull Request到本仓库的develop分支

### 代码规范
- 遵循项目的ESLint和Prettier配置
- 提交前运行`npm run lint:fix`自动修复代码风格问题
- 提交信息遵循Conventional Commits规范：
  - `feat:` 新功能
  - `fix:` 修复bug
  - `docs:` 文档更新
  - `style:` 代码格式调整（不影响功能）
  - `refactor:` 重构代码
  - `test:` 测试相关

## Star History

<a href="https://www.star-history.com/?repos=ptghb%2Fvirtual-person&type=date&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ptghb/virtual-person&type=date&theme=dark&legend=bottom-right&sealed_token=iDP0yBGjxP7JSjHgfHVC5GEkjgt4kkEJDZqTcIobNB8-l4CC5aeWPV6YGbutiN_KzWIVjf68xNu9DF2_CEoy9MeO9MQwHw_cuFyHQzqjHnUIVrGJ8uOCYQ" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ptghb/virtual-person&type=date&legend=bottom-right&sealed_token=iDP0yBGjxP7JSjHgfHVC5GEkjgt4kkEJDZqTcIobNB8-l4CC5aeWPV6YGbutiN_KzWIVjf68xNu9DF2_CEoy9MeO9MQwHw_cuFyHQzqjHnUIVrGJ8uOCYQ" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=ptghb/virtual-person&type=date&legend=bottom-right&sealed_token=iDP0yBGjxP7JSjHgfHVC5GEkjgt4kkEJDZqTcIobNB8-l4CC5aeWPV6YGbutiN_KzWIVjf68xNu9DF2_CEoy9MeO9MQwHw_cuFyHQzqjHnUIVrGJ8uOCYQ" />
 </picture>
</a>

## 联系我
如有任何问题或建议，欢迎通过以下方式联系我：

<img src="./weixin.jpg" alt="微信二维码" width="200" />

## 请作者喝杯咖啡？
多少都是心意，一分也是对我莫大的鼓励！谢谢您的支持！

也可以通过 [爱发电支持小凡 AI](https://afdian.com/a/xiaofanai)。

<img src="./weixinpay.jpg" alt="微信支付" width="200" /> <img src="./alipay.jpg" alt="支付宝支付" width="200" />
