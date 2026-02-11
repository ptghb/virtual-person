# 小凡AI - 你的智能虚拟伴侣

一个深度融合Live2D虚拟形象与AI对话引擎的智能陪伴系统。通过集成OpenAI/智谱AI的自然语言理解、实时WebSocket通信、手势识别（MediaPipe）与TTS语音合成，打造出可交互、有情感的AI虚拟伴侣"小凡"。

## 核心亮点

- 🪆 **生动Live2D形象**：基于Cubism SDK的3D化虚拟角色，支持拖拽、缩放、动画联动，内置9款精美模型
- 🗣️ **智能对话与语音**：接入OpenAI/智谱AI API，具备上下文记忆与角色人格；集成EasyVoice TTS，实现文本转语音
- 👋 **手势交互控制**：通过摄像头识别手势，伸出食指显示小手光标，碰到模型触发随机动画
- 🎭 **多模态交互体验**：支持文字、图片、音频消息，动画与音频深度同步
- 🔧 **全栈技术集成**：前端React 19 + TypeScript 5.8 + Vite 6.3，后端FastAPI + LangChain，Docker化TTS服务
- 🎨 **现代化UI设计**：基于Ant Design 6的精美界面，响应式布局

## 场景应用

- 🎭 **情感陪伴与日常聊天**：作为知心朋友，提供温暖贴心的对话体验
- 📺 **虚拟主播/数字人互动**：可用于直播、视频制作等场景
- 🤖 **AI助手 + 虚拟形象融合实验**：探索AI与虚拟形象的结合应用
- 👋 **手势交互与动画控制技术演示**：展示MediaPipe与Live2D的深度集成，实现食指追踪和碰撞检测

## 项目简介

小凡AI是一个集成了Live2D虚拟形象的智能对话系统，具有以下特点：

- **Live2D虚拟形象**：使用Live2D Cubism SDK渲染的可爱虚拟角色"小凡"，支持9款官方模型（Haru、Hiyori、Mao、Mark、Natori、Ren、Rice、Wanko）
- **AI智能对话**：支持OpenAI和智谱AI双引擎切换，具备自然语言理解能力
- **实时通信**：通过WebSocket实现前后端实时消息交互，支持自动重连
- **动画控制**：支持多种动画播放模式和音频联动，智能选择动画
- **打字机效果**：AI回复采用打字机效果逐字显示，支持完成回调
- **多模态消息**：支持文字、图片、音频等多种消息类型，消息历史记录最多保存100条

## 技术架构

### 前端技术栈

- **框架**：TypeScript 5.8.3 + Vite 6.3.5
- **Live2D引擎**：Live2D Cubism SDK for Web（Core + Framework）
- **UI框架**：React 19.2.3 + Ant Design 6.2.2
- **手势识别**：MediaPipe Hands 0.4.1675469240
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
- **依赖管理**：pip + requirements.txt
- **TTS服务**：EasyVoice (Docker)
- **容器化部署**：Docker + Docker Compose
- **其他库**：httpx 0.25.0+, aiofiles 23.0.0+, Pillow 10.0.0+, emoji 2.15.0+, zhipuai 2.0.0+, numpy 1.24.0+

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
│   ├── services/                # 服务层目录
│   │   ├── llm_service.py      # 大模型服务（OpenAI + 智谱AI双引擎）
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
├── .gitignore                   # Git忽略文件配置
├── .gitmodules                  # Git子模块配置
├── CHANGELOG.md                 # 项目更新日志
├── LICENSE.md                   # 许可证文件
├── NOTICE.md                    # 注意事项
└── README.md                    # 本说明文档
```

## 功能特性

### 1. Live2D虚拟形象

- **多模型支持**：内置9款官方Live2D模型（Haru、Hiyori、Mao、Mark、Natori、Ren、Rice、Wanko）
- **交互功能**：支持鼠标拖拽、缩放控制（0.5x - 2.0x）、触摸交互
- **动画系统**：多种动画效果（待机动画、随机动画、说话动画），支持循环播放
- **音频联动**：音频播放时自动停止动画，停止后恢复待机动画
- **手势控制**：通过MediaPipe Hands实现手势识别，伸出食指显示小手光标，碰到模型触发随机动画
- **口型同步**：RMS值放大5.0倍，通过ParamMouthOpenY参数实现精确口型同步

### 2. AI对话功能

- **双引擎支持**：支持OpenAI和智谱AI双引擎切换（通过MODEL_TYPE配置）
- **自然语言理解**：基于LangChain框架，具备强大的对话能力
- **上下文记忆**：保持对话连续性，支持多轮对话
- **角色设定**：知心朋友"小凡"，温柔体贴、亲切自然的人格设定
- **多客户端管理**：每个客户端独立会话，互不干扰
- **智能动画选择**：根据对话氛围自动选择合适的Live2D动画
- **多模态输入**：支持文字、图片、语音三种输入方式
- **图片分析**：集成智谱AI GLM-4V-Flash模型，支持图片内容分析与描述
- **自动拍照**：支持前端拍照指令，自动捕获画面并发送给AI分析

### 3. WebSocket实时通信

- **自动重连机制**：连接断开后自动重连（最多5次，间隔3秒）
- **多消息类型**：支持文字、图片、音频、控制指令等多种消息类型
- **实时状态显示**：连接中（橙色）、已连接（绿色）、断开/错误（红色）
- **消息历史记录**：最多保存100条消息，支持时间戳格式化显示
- **音频流处理**：支持实时音频流传输和语音识别（PCM格式）
- **消息格式**：JSON格式，包含clientId、message、modelName、isAudio、should_take_photo等字段
- **图片消息音频**：支持图片消息转语音功能，可配置音频开关

### 4. 动画控制系统

- **循环播放**：支持循环播放随机动画或指定动画序号
- **动画选择**：通过playMotionByNo()方法播放预设动画索引
- **状态管理**：通过_isMotionEnabled标志管理动画播放状态
- **音频联动**：音频播放时自动停止动画，停止后恢复待机动画（restartIdleMotion）
- **说话动画**：支持说话相关动画（如haru_g_m01），与TTS语音同步
- **循环实现**：通过时间计算(time -= duration)和状态重置(updateForNextLoop)实现循环播放
- **配置驱动**：动画循环由motion3.json配置文件中的Loop字段控制
- **动画切换事件**：新增动画切换事件机制，支持动态切换动画索引

### 5. 音频管理

- **本地音频上传**：支持上传本地音频文件（MP3、WAV等格式）
- **播放控制**：音频播放/停止控制，状态实时显示
- **动画集成**：与动画系统深度集成，音频播放时自动联动动画
- **数据加载**：支持从ArrayBuffer加载音频数据
- **口型同步**：RMS值放大5.0倍，通过ParamMouthOpenY参数实现精确口型同步
- **TTS集成**：集成EasyVoice TTS服务，支持文本转语音（Docker部署）
- **语音识别**：集成SiliconFlow SenseVoiceSmall，支持语音转文字（WAV格式）
- **音频流处理**：支持实时音频流传输，格式为PCM，包含sample_rate、channels等参数
- **图片音频**：支持图片消息转语音功能，可配置音频开关

## 快速开始

### 环境要求

- **Node.js**: 20.19.5+ / 22.20.0+ / 24.10.0+
- **Python**: 3.8+
- **Docker**: 用于运行EasyVoice TTS服务（可选，如需语音功能则必须）
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

# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

服务启动后访问：
- 前端服务：http://localhost（或 http://localhost:80）
- 后端服务：http://localhost:8000
- TTS服务：http://localhost:3000

> 💡 提示：Nginx 监听 80 端口作为统一入口，前端服务通过 Nginx 反向代理访问。

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

### 手势控制（全新交互）

1. **启用手势同步**：点击"启用手势同步"按钮开启手势识别
2. **允许摄像头权限**：浏览器会请求摄像头访问权限，请允许
3. **手势交互**：
   - 伸出食指（左手或右手）→ 屏幕出现小手光标 👋
   - 小手光标会跟随你的食指指尖移动
   - 小手光标仅在 Live2D 模型区域内移动
   - 将小手移动到 Live2D 模型上 → 触发随机动画播放
   - 动画播放完成后，可以再次触发新的动画
4. **实时反馈**：界面会显示摄像头画面和手指状态
5. **技术特性**：
   - 支持左右手独立追踪
   - 坐标映射到 Live2D 模型区域
   - 碰撞检测：检测小手是否碰到模型碰撞区域
   - 位置平滑：使用线性插值算法减少手势抖动
   - 更新节流：限制更新频率为每 50ms 一次，避免闪烁
   - 动画回调：通过动画完成回调精确控制播放状态

> 注意：手势控制功能需要模型支持碰撞区域。不同模型支持程度不同，Haru 模型支持 Body 碰撞区域。

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

在 `BackendProject/main.py` 中修改系统提示词：

```python
system_message = """你是一个知心朋友，名字叫小凡..."""
```

### 模型类型配置

通过 `MODEL_TYPE` 环境变量切换AI引擎：

```env
# 使用智谱AI（推荐，支持图片分析）
MODEL_TYPE=zhipu

# 使用OpenAI（仅支持文字对话）
MODEL_TYPE=openai
```

### Live2D模型配置

模型文件位于 `public/Resources/` 目录，当前支持9款官方模型：
- Haru：支持 Body 碰撞区域，适合手势交互
- Hiyori：完整模型支持
- Mao：支持完整的肘部关节控制
- Mark、Natori、Ren、Rice、Wanko：各具特色的官方模型

支持替换为其他Live2D模型，只需将模型文件放入对应目录即可。

> 注意：手势交互功能需要模型支持碰撞区域。不同模型支持程度不同，Haru 模型支持 Body 碰撞区域。

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
- **手势识别服务**：`src/services/HandGestureService.ts` - MediaPipe手势识别，支持食指指尖位置追踪
- **手势控制组件**：`src/components/HandGestureControls.tsx` - 手势交互控制，实现小手光标和碰撞检测
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

- 确认已允许浏览器访问摄像头权限（HTTPS或localhost环境）
- 检查当前使用的Live2D模型是否支持碰撞区域：
  - Haru模型：支持 Body 碰撞区域
  - 其他模型：支持程度可能不同，请查看模型文档
- 查看浏览器控制台是否有MediaPipe相关错误（摄像头权限、模型加载等）
- 确认摄像头设备正常工作
- 查看控制台日志，确认碰撞检测是否正常工作（会显示碰撞区域检测结果）
- 如果小手光标不显示，检查是否正确伸出食指
- 如果小手光标不跟随手指移动，检查坐标映射是否正确

### 6. TTS服务无法使用

- 确认Docker已安装并运行：`docker --version`
- 检查TTS容器是否启动：`docker ps | grep easyvoice`
- 查看容器日志：`docker logs <container_id>`
- 确认端口3000未被占用：`lsof -i :3000` 或 `netstat -an | grep 3000`
- 检查audio目录是否存在且有写入权限：`ls -la audio/`
- 确认环境变量`ISAUDIO`设置为`True`
- 测试TTS服务是否可访问：`curl http://localhost:3000`

### 10. Docker Compose 部署问题

- 确认Docker和Docker Compose已安装：`docker --version` 和 `docker-compose --version`
- 检查端口是否被占用：80（Nginx入口）、8000（后端）、3000（TTS）
- 查看服务状态：`docker-compose ps`
- 查看服务日志：`docker-compose logs -f <service_name>`
- 确认环境变量已正确配置在 `BackendProject/.env` 文件中
- 检查Git子模块是否已初始化：`git submodule status`
- 如需重新构建镜像：`docker-compose build --no-cache`
- 前端服务通过 Nginx 反向代理访问，请访问 http://localhost 而非 8080 端口

### 7. 图片识别功能不工作

- 确认已配置`ZHIPUAI_API_KEY`环境变量且有效
- 检查智谱AI API密钥是否有足够的配额和权限
- 查看后端日志中的GLM-4V调用错误信息（网络超时、认证失败等）
- 确认图片格式支持（JPEG、PNG、GIF、WEBP）
- 检查图片大小是否超过5MB限制（IMAGE_CONFIG.MAX_FILE_SIZE）
- 测试智谱AI API是否可访问
- 确认 `MODEL_TYPE` 设置为 `zhipu`

### 8. 语音识别功能不工作

- 确认已配置`SILICONFLOW_API_KEY`环境变量且有效
- 检查SiliconFlow API密钥是否有足够的配额和权限
- 查看后端日志中的语音识别错误信息（网络超时、认证失败等）
- 确认音频文件格式为WAV（PCM编码）
- 检查`audio_files`目录是否存在且有写入权限：`ls -la BackendProject/audio_files/`
- 测试SiliconFlow API是否可访问

### 9. 示例环境限制（https://xiaofan.laogeworld.cn）

⚠️ 注意事项：
- 此环境没有部署TTS服务，不支持开启语音功能（ISAUDIO=False）
- 如需体验以上功能，请自行部署完整环境
- 建议使用 Docker Compose 一键部署完整环境

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

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解项目更新历史。

### 最新更新亮点

- 👋 全新手势交互：伸出食指显示小手光标，碰到模型触发随机动画
- 🎯 精确碰撞检测：支持坐标映射到 Live2D 模型区域
- ✨ 位置平滑处理：使用线性插值算法减少手势抖动
- 🚀 更新节流机制：限制更新频率，避免闪烁
- 🎬 动画完成回调：精确控制动画播放状态
- ✨ 支持OpenAI和智谱AI双引擎切换
- 🎭 新增9款Live2D官方模型支持
- 📱 改进移动端支持和响应式布局
- 🔧 优化WebSocket自动重连机制
- 🎨 升级到React 19和Ant Design 6

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
[![Star History Chart](https://api.star-history.com/svg?repos=ptghb/virtual-person&type=date&legend=bottom-right)](https://www.star-history.com/#ptghb/virtual-person&type=date&legend=bottom-right)

## 请作者喝杯咖啡？
多少都是心意，一分也是对我莫大的鼓励！谢谢您的支持！

<img src="./weixinpay.jpg" alt="微信支付" width="200" /> <img src="./alipay.jpg" alt="支付宝支付" width="200" />








