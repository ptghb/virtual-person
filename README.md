# 小凡AI - Live2D智能对话助手

一个基于Live2D Cubism SDK和OpenAI API的智能对话助手项目，结合了Live2D虚拟形象、实时WebSocket通信和AI对话功能。

## 项目简介

小凡AI是一个集成了Live2D虚拟形象的智能对话系统，具有以下特点：

- **Live2D虚拟形象**：使用Live2D Cubism SDK渲染的可爱虚拟角色"小凡"
- **AI智能对话**：基于OpenAI API的自然语言对话能力
- **实时通信**：通过WebSocket实现前后端实时消息交互
- **动画控制**：支持多种动画播放模式和音频联动
- **打字机效果**：AI回复采用打字机效果逐字显示
- **多模态消息**：支持文字、图片、音频等多种消息类型

## 技术架构

### 前端技术栈

- **框架**：TypeScript 5.8.3 + Vite 6.3.5
- **Live2D引擎**：Live2D Cubism SDK for Web
- **UI框架**：React 18 + Ant Design 5
- **手势识别**：MediaPipe Hands
- **通信协议**：WebSocket
- **音频处理**：Web Audio API


### 后端技术栈

- **框架**：FastAPI (Python)
- **AI模型**：LangChain + OpenAI API
- **通信协议**：WebSocket
- **依赖管理**：pip
- **TTS服务**：EasyVoice (Docker)

## 项目结构

```
CubismWebSamples/
├── BackendProject/              # 后端项目
│   ├── main.py                 # FastAPI主程序
│   ├── requirements.txt        # Python依赖
│   └── .env                    # 环境变量配置
├── audio/                      # TTS音频输出目录（Docker挂载）
├── FrontendProject/
│   └── TypeScript/
│       └── AI/                 # 前端AI项目
│           ├── src/
│           │   ├── main.tsx                # 入口文件
│           │   ├── App.tsx                 # 主应用组件
│           │   ├── config.ts               # 配置文件
│           │   ├── websocketmanager.ts     # WebSocket管理器
│           │   ├── lappdelegate.ts         # 应用委托
│           │   ├── lapplive2dmanager.ts    # Live2D管理器
│           │   ├── lappmodel.ts            # Live2D模型
│           │   ├── lappaudiomanager.ts     # 音频管理器
│           │   ├── touchmanager.ts         # 触摸管理器
│           │   ├── components/             # React组件
│           │   │   ├── AudioControls.tsx       # 音频控制组件
│           │   │   ├── MotionControls.tsx      # 动画控制组件
│           │   │   ├── ZoomControls.tsx        # 缩放控制组件
│           │   │   ├── WebSocketPanel.tsx      # WebSocket状态面板
│           │   │   └── HandGestureControls.tsx # 手势控制组件
│           │   ├── services/              # 服务层
│           │   │   └── HandGestureService.ts   # 手势识别服务
│           │   └── ...                     # 其他Live2D相关文件
│           ├── public/
│           │   ├── Core/                   # Live2D Core库
│           │   └── Resources/              # 模型资源文件
│           ├── index.html                  # 主页面
│           ├── package.json                # 项目配置
│           └── vite.config.mts             # Vite配置
├── Core/                        # Live2D Cubism Core
├── Framework/                   # Live2D Framework
└── README.md                    # 中文说明文档
```

## 功能特性

### 1. Live2D虚拟形象

- 基于Live2D Cubism SDK的3D虚拟角色渲染
- 支持鼠标拖拽交互
- 多种动画效果（待机动画、随机动画等）
- 音频播放时动画联动控制
- 支持模型缩放控制
- 支持手势控制（MediaPipe Hands）

### 2. AI对话功能

- 基于OpenAI API的自然语言理解
- 上下文记忆功能，保持对话连续性
- 角色设定：知心朋友"小凡"，温柔体贴、亲切自然
- 支持多客户端独立会话管理

### 3. WebSocket实时通信

- 自动重连机制（最多5次，间隔3秒）
- 支持多种消息类型（文字、图片、音频）
- 实时状态显示（连接中、已连接、断开、错误）
- 消息历史记录

### 4. 动画控制系统

- 循环播放随机动画
- 指定动画序号播放
- 动画启停状态控制
- 音频播放时自动停止动画，停止后恢复
- 支持说话相关动画（如haru_g_m01）

### 5. 音频管理

- 本地音频文件上传
- 音频播放/停止控制
- 音频状态实时显示
- 与动画系统深度集成
- 支持从ArrayBuffer加载音频数据
- RMS值放大5.0倍以获得更好的口型效果
- 通过ParamMouthOpenY参数实现口型同步
- 集成EasyVoice TTS服务，支持文本转语音

## 快速开始

### 环境要求

- **Node.js**: 20.19.5+ / 22.20.0+ / 24.10.0
- **Python**: 3.8+
- **浏览器**: 支持WebGL的现代浏览器

### 后端部署

1. 进入后端项目目录：
```bash
cd BackendProject
```

2. 安装Python依赖：
```bash
pip install -r requirements.txt
```

3. 配置环境变量（编辑`.env`文件）：
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

现在文件中有一个OPENAI_API_KEY，体验用的，有限制，请谨慎使用

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

3. 构建开发版本：
```bash
npm run build
```

4. 启动开发服务器：
```bash
npm run start
```

前端服务将在 `http://localhost:80` 启动

### 构建生产版本

```bash
npm run build:prod
```

构建产物将输出到 `dist` 目录

### 部署

```bash
npm run serve
```

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

### 手势控制（新增）

1. **启用手势同步**：点击"启用手势同步"按钮开启手势识别
2. **允许摄像头权限**：浏览器会请求摄像头访问权限，请允许
3. **手势同步**：
   - 伸出左手食指/中指 → Live2D左手臂抬起
   - 伸出右手食指/中指 → Live2D右手臂抬起
   - 收起手指 → 对应手臂放下
4. **实时反馈**：界面会显示摄像头画面和手指状态

> 注意：手势控制功能需要模型支持手臂参数。不同模型支持程度不同，Haru模型支持手臂和手腕控制，Mao模型支持完整的肘部关节控制。

### WebSocket状态

- **绿色圆点**：已连接
- **橙色圆点**：连接中
- **红色圆点**：断开或错误

## 配置说明

### WebSocket服务器地址

在 `src/main.ts` 中修改WebSocket服务器地址：

```typescript
const wsUrl = `ws://your-server:8000/ws/${clientId}`;
```

### AI角色设定

在 `BackendProject/main.py` 中修改系统提示词：

```python
system_message = """你是一个知心朋友，名字叫小凡..."""
```

### Live2D模型

模型文件位于 `public/Resources/` 目录，支持替换为其他Live2D模型。

### TTS服务配置

TTS服务使用Docker容器运行，配置说明：

- **镜像**：cosincox/easyvoice:latest
- **端口映射**：3000:3000
- **目录挂载**：`$(pwd)/audio:/app/audio` - TTS生成的音频文件将保存在项目根目录的audio文件夹中
- **服务地址**：http://localhost:3000

```bash
# 确保Docker已安装并运行
# 启动EasyVoice TTS服务，映射端口3000，挂载audio目录
docker run -d -p 3000:3000 -v "$(pwd)/audio:/app/audio" cosincox/easyvoice:latest
```

如需修改TTS服务配置，请编辑后端代码中的TTS API调用部分。

## 开发指南

### 前端开发

- **入口文件**：`src/main.tsx`
- **主应用组件**：`src/App.tsx`
- **WebSocket管理**：`src/websocketmanager.ts`
- **Live2D管理**：`src/lapplive2dmanager.ts`
- **模型管理**：`src/lappmodel.ts`
- **手势识别服务**：`src/services/HandGestureService.ts`
- **React组件**：`src/components/`

### 后端开发

- **主程序**：`BackendProject/main.py`
- **API路由**：FastAPI路由定义
- **消息处理**：LangChain消息链处理

### 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint代码规范
- 使用Prettier格式化代码
- React组件使用函数式组件和Hooks

## 常见问题

### 1. WebSocket连接失败

- 检查后端服务是否启动
- 确认WebSocket服务器地址配置正确
- 查看浏览器控制台错误信息

### 2. Live2D模型不显示

- 确认已执行 `npm run copy_resources`
- 检查 `public/Resources/` 目录下是否有模型文件
- 查看浏览器控制台是否有资源加载错误

### 3. AI回复异常

- 检查 `.env` 文件中的API配置
- 确认OpenAI API密钥有效
- 查看后端日志输出

### 4. 音频无法播放

- 确认音频文件格式支持（MP3、WAV等）
- 检查浏览器是否允许自动播放
- 查看浏览器控制台错误信息
- 确认TTS Docker容器是否正常运行：`docker ps`
- 检查audio目录是否有写入权限

### 5. 手势控制不生效

- 确认已允许浏览器访问摄像头
- 检查当前使用的Live2D模型是否支持手臂参数
- Haru模型支持手臂和手腕控制，但不支持手指关节控制
- Mao模型支持完整的肘部关节控制
- 查看浏览器控制台是否有MediaPipe相关错误

### 6. TTS服务无法使用

- 确认Docker已安装并运行：`docker --version`
- 检查TTS容器是否启动：`docker ps`
- 查看容器日志：`docker logs <container_id>`
- 确认端口3000未被占用
- 检查audio目录是否存在且有写入权限

### 7. 示例环境 47.121.30.160
- 此环境没有部署TTS服务，不支持开启语音;
- 此环境暂时没有域名和证书，无法使用摄像头。所以不能体验手势控制。
- 需要体验以上两个功能，可以自行部署。


## 许可证

本项目基于Live2D Open Software License。使用前请阅读 [LICENSE.md](LICENSE.md)。

## 注意事项

请阅读 [NOTICE.md](NOTICE.md) 了解使用本SDK的注意事项。

## 相关链接

- [Live2D Cubism SDK Manual](https://docs.live2d.com/cubism-sdk-manual/top/)
- [Live2D Cubism SDK下载](https://www.live2d.com/download/cubism-sdk/download-web/)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [LangChain文档](https://python.langchain.com/)
- [MediaPipe Hands文档](https://google.github.io/mediapipe/solutions/hands.html)
- [React文档](https://react.dev/)
- [Ant Design文档](https://ant.design/)
- [EasyVoice TTS](https://github.com/cosincox/easyvoice)

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解项目更新历史。

## 贡献

欢迎提交Issue和Pull Request来改进本项目。

## 联系方式

如有问题或建议，请通过GitHub Issues联系我们。
