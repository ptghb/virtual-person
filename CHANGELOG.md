# 更新日志 (Changelog)

本文档记录了项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 2026-09-14 桌面端虚拟人物、Core 6 升级与 Shader 修复

#### 新增
- **Electron 桌面端虚拟人物窗口**：新增透明、无边框桌面虚拟人物窗口，面向 Windows 与 macOS 打包；桌面模式只显示 Live2D 人物，不显示页面背景和底部按钮。
- **桌面端交互**：桌面人物支持鼠标拖动窗口、滚轮放大/缩小、视线跟随鼠标，以及左右切换虚拟人物。
- **人物切换联动服务端**：桌面端切换人物后同步更新本地偏好，并通过 `POST /api/companions/current` 与服务端当前 companion 关联。
- **Core 6 模型支持**：升级 Live2D Cubism Core 至支持 MOC3 v6 的版本，使 `Ren` 等 v6 模型可以被 Core 正确识别和加载。
- **Framework 官方版本升级**：将 Cubism Framework 升级为 SDK 5-r.5 官方代码，并将兼容改动放在应用层，避免修改 `Framework/` 官方源码。

#### 优化
- **前端资源复制**：`copy_resources.js` 在本地与 Docker 构建时复制 `Core`、`Resources`、`Framework/Shaders` 和 MediaPipe 资源，保证浏览器、Docker 和桌面包资源一致。
- **Shader 路径兼容**：新增应用层 `ShaderPath` 解析，兼容 Web、Docker、子路由刷新和 Electron `file://` 场景。
- **Renderer 初始化适配**：应用层适配新版 Framework renderer 初始化参数，并在 renderer 启动后显式加载 Shader。
- **Docker 前端重建**：前端 Dockerfile 补充 Core 与 Resources 构建上下文，完成前端镜像重建与服务重启。

#### 修复
- **所有模型不显示**：修复 Framework 5-r.5 将 WebGL Shader 拆为外部文件后，构建产物未包含 `Framework/Shaders/WebGL` 导致 `Shader program is not initialized`、模型无法渲染的问题。
- **Ren 不显示**：修复 `Ren.moc3` 为 MOC3 v6 而旧 Core 仅支持较低 moc 版本导致的加载失败。
- **桌面透明背景**：修复桌面窗口中 canvas / 页面背景仍显示的问题，桌面模式保持透明。
- **桌面视线方向**：修正桌面虚拟人物视线跟随方向反向的问题。

#### 验证
- **前端类型检查**：通过 `npm run test`（`tsc --noEmit`）。
- **Web 构建**：通过 `npm run build:prod`。
- **桌面构建**：通过 `npm run build:desktop`。
- **Docker 构建与启动**：通过 `docker compose build frontend` 和 `docker compose up -d --no-deps frontend`。
- **桌面打包**：生成修复包 `FrontendProject/TypeScript/AI/release/desktop-core6-shaderfix-20260914-171922/XiaofanAI-mac-arm64-core6-shaderfix.zip`，包内 `app.asar` 已包含 `/dist/Framework/Shaders/WebGL`。

### 2026-09-10 情绪系统收尾：直播隔离、可视化增强、前端测试、架构文档

#### 新增
- **直播情绪隔离完善**：直播停止时（`POST /api/livestream/douyin/stop`）自动调用 `manager.reset_emotion_state("livestream_session")` 清除直播专属情绪状态，避免残留情绪影响下次直播或泄漏到普通聊天会话。`ConnectionManager` 新增 `reset_emotion_state()` 方法。
- **情绪历史查询 API**：新增 `GET /api/debug/emotion/{session_id}/history` 端点，返回指定会话最近 20 条情绪变化记录（按时间正序），用于调试面板绘制曲线图。
- **情绪历史曲线图**：调试面板新增 SVG 折线图，展示最近情绪变化趋势，数据点按情绪类型着色，每 5 秒自动刷新。点击"曲线"按钮展开/收起。
- **架构文档**：新增 `docs/EMOTION.md`，完整记录情绪状态机、关键词规则、衰减机制、表情映射表、WebSocket 协议、三通道接入、持久化、调试方式和测试覆盖。
- **前端测试增强**：`emotion.test.ts` 从 13 项扩展到 32 项测试，新增情绪标签语义验证、`normalizeCompanionEmotion` 边界测试（数字字符串、空白、对象）、`getExpressionForEmotion` 回退逻辑测试（空模型名、大小写敏感）、`EXPRESSION_MAP` 结构完整性测试。

#### 优化
- **`timeline_repository.py`**：新增 `get_recent_emotion_events()` 方法，按 session_id 查询情绪事件，时间正序返回。
- **`timeline_service.py`**：新增 `get_emotion_history()` 服务方法。
- **`EmotionDebugPanel.tsx`**：新增"曲线"按钮和 `EmotionHistoryChart` 组件（纯 SVG 实现，不依赖额外图表库），新增 `EMOTION_COLORS` 颜色映射与 CSS 保持一致。
- **README.md**：添加情绪系统文档链接，更新核心亮点和特性描述。

#### 验证
- **后端编译**：通过 `python3 -m py_compile`。
- **前端类型检查**：通过 `npx tsc --noEmit`。
- **后端单元测试**：5 项全通过。
- **前端单元测试**：32 项全通过（`npx vitest run`）。
- **Docker 部署**：重新构建并部署 `backend`、`frontend`、`nginx`，`curl http://localhost/health` 返回 `healthy`。

### 2026-09-10 全场景情绪系统统一接入

#### 新增
- **全场景情绪统一**：文字聊天、图片聊天和抖音直播互动统一接入同一套情绪系统。后端在所有回复路径中分析用户输入情绪，通过 `assistant.meta` 和旧格式消息（type=1）携带情绪字段，前端统一派发 `companion-emotion` 事件切换 Live2D 表情和动作。
- **图片聊天情绪**：`handle_image_message` 新增情绪分析，根据用户 prompt 识别情绪，存储会话情绪状态，发送 `assistant.meta` 元数据和携带情绪字段的回复消息。
- **直播互动情绪**：`handle_comment_message` 的互动动作（进房/关注/点赞/礼物）和评论回复均接入情绪系统。互动动作按类型映射情绪（happy/shy），评论回复使用 `analyze_companion_emotion` 分析评论内容情绪。
- **直播消息情绪传递**：`send_livestream_assistant_message` 新增 emotion/emotion_label/emotion_intensity/expression 参数，发送前先发 `assistant.meta` 让前端切换表情，再发文本消息。
- **旧格式消息情绪派发**：前端 `websocketmanager.ts` 在 `onmessage` 中，对旧格式消息（type=1）携带的 `emotion`/`expression` 字段也派发 `companion-emotion` 事件，不再只限于 `assistant.meta` 类型。
- **Hiyori 表情资源**：新增 `Normal`、`Smile`、`Blushing`、`Sad`、`Wronged`、`Angry` 六个 `.exp3.json` 表情文件，并在 `Hiyori.model3.json` 中注册 `Expressions` 条目。

#### 优化
- **`send_personal_message` 扩展**：新增 `emotion`、`emotion_label`、`emotion_intensity`、`expression` 参数，旧格式消息也能携带情绪元数据，前端据此切换表情。
- **情绪调试面板下拉框**：将 Ant Design `<Select>` 替换为原生 `<select>`，彻底解决下拉框被 Live2D 舞台 `z-index` 和 `overflow` 遮挡的问题。移除无效的 `.emotion-debug-select-popup` CSS，新增 `.emotion-debug-panel__select` 原生 select 样式。
- **前端类型声明**：`websocketmanager.ts` 的 `parsedData` 类型新增 `emotion`、`emotion_label`、`emotion_intensity`、`expression` 字段，保证 TypeScript 严格类型检查通过。

#### 修复
- **调试面板下拉框遮挡**：修复情绪调试面板点击下拉框后选项被 Live2D canvas 层级遮挡、视觉不可见的问题。根因是 AntD Select 的 portal 渲染受父容器 `z-index: 3` 和 `pointer-events: none` 限制；改用原生 `<select>` 后由浏览器直接渲染，不受容器层级影响。

#### 验证
- **后端编译**：通过 `python3 -m py_compile BackendProject/main.py`。
- **前端类型检查**：通过 `npm run test`（`tsc --noEmit`）。
- **后端单元测试**：通过 `docker compose exec -T backend python -m unittest discover -s tests -p 'test_*.py'`（5 项全通过）。
- **Docker 部署**：重新构建并部署 `backend`、`frontend`、`nginx`，`curl http://localhost/health` 返回 `healthy`。
- **Debug API**：`POST /api/debug/emotion` 返回正确的情绪状态、表情和动作映射。
- **容器验证**：后端镜像包含 5 处 `analyze_companion_emotion` 调用，前端构建产物包含 `companion-emotion` 事件派发和 `emotion_intensity` 字段。

### 2026-09-08 情绪系统 Phase 1：表情自动切换与调试面板

#### 新增
- **情绪状态机**：后端 `ConnectionManager` 新增会话级 `emotion_states` 内存存储，实现 `analyze_companion_emotion` 关键词 + 衰减情绪状态机。支持 10 种情绪（neutral/happy/shy/sad/worried/wronged/angry/comforting/playful/sleepy），每种情绪有强度 boost、衰减系数（0.85）和自然恢复机制。
- **情绪标签与规则**：新增 `EMOTION_LABELS`（中文标签映射）和 `EMOTION_RULES`（关键词触发规则），覆盖疲惫、难过、亲密、冷淡、冲突、开心、撒娇、晚安等场景。
- **情绪 Prompt 注入**：新增 `build_emotion_prompt_context`，将当前情绪状态注入系统提示词，让 AI 回复语气自然贴合情绪状态。
- **表情与动作映射**：新增 `select_animation_by_emotion` 和 `select_expression_by_emotion`，按情绪和模型名称选择对应的 Live2D 动画索引和表情 ID。支持 Hiyori、Haru、Mao、Ren、Natori 五款模型。
- **文字聊天情绪接入**：`handle_text_message` 在回复前分析用户输入情绪，存储会话情绪状态，注入情绪上下文到 prompt，并通过 `assistant.meta` 发送情绪元数据（emotion/emotion_label/emotion_intensity/emotion_reason/expression）。
- **前端情绪类型**：新增 `emotion.ts`，定义 `CompanionEmotion` 类型、`EMOTION_LABEL_MAP` 标签映射和 `EXPRESSION_MAP` 表情映射。
- **情绪调试面板**：新增 `EmotionDebugPanel.tsx` 组件，仅在 URL 包含 `?debugEmotion=true` 时显示。支持选择情绪、调整强度、应用/重置，展示当前表情和动作映射。
- **数字人舞台情绪展示**：`DigitalHumanStage.tsx` 监听 `companion-emotion` 事件，切换 Live2D 表情并更新状态文案（如"小凡很开心"）。
- **WebSocket 情绪派发**：`websocketmanager.ts` 解析 `assistant.meta` 中的情绪字段，派发 `companion-emotion` 自定义事件。
- **Live2D 表情切换**：`lapplive2dmanager.ts` 新增 `setExpression(expressionId)` 方法；`avatar.service.ts` 新增 `setExpression` 服务方法。
- **后端 Debug API**：新增 `POST /api/debug/emotion`（手动设置情绪）和 `GET /api/debug/emotion/{session_id}`（查询情绪状态）接口。
- **后端单元测试**：新增 `tests/test_emotion.py`，覆盖 worried/shy/decay/recovery/neutral 行为。
- **Hiyori 表情注册**：在 `Hiyori.model3.json` 中注册 Expressions 条目，新增 6 个表情文件。
- **CSS 样式**：新增情绪调试面板样式和情绪标签圆点样式；处理 `.digital-human-stage` 的 `pointer-events: none` 对调试面板的影响。

#### 验证
- **后端编译**：通过 `python3 -m py_compile`。
- **前端类型检查**：通过 `npm run test`（`tsc --noEmit`）。
- **后端单元测试**：5 项全通过。
- **Docker 部署**：重新构建并部署前后端和 nginx。

### 2026-09-05 Live2D 视线跟随与人脸注视

#### 新增
- **鼠标视线跟随**：Live2D 人物支持在未按下鼠标时根据指针位置自然调整视线、头部和身体朝向。
- **人脸注视模式**：多模态聊天页点击“摸摸我”后，摄像头会同时进行 MediaPipe Hands 双手识别和 MediaPipe Face Detection 人脸识别；识别到人脸时，虚拟人物会看向真实人脸位置。
- **本地人脸识别资源**：新增 `@mediapipe/face_detection` 依赖，构建时将 Face Detection JS、WASM、TFLite 和 binarypb 资源复制到 `/mediapipe/face_detection/`，运行时不依赖外部 CDN。

#### 优化
- **输入源切换**：“摸摸我”开启期间暂停鼠标 hover/拖拽视线跟随，避免鼠标与摄像头人脸识别同时抢占 Live2D 视线控制权；关闭“摸摸我”后恢复鼠标跟随并让人物自然回正。
- **跟随手感**：降低头部和身体跟随幅度，保留更明显的眼球跟随；人脸偏移映射放大，使真人在摄像头画面中轻微移动时也能看出虚拟人物视线变化。
- **识别反馈**：“摸摸我”摄像头预览状态从“双手识别中”调整为“寻找人脸中 / 已锁定人脸”，并在识别到人脸时绘制绿色人脸框，便于排查摄像头和识别状态。
- **坐标更新**：修复拖拽/指针移动时先读取旧坐标再更新新坐标的问题，减少视线跟随延迟。
- **Nginx 静态部署**：本地 Compose 部署中，Nginx 改为直接服务已挂载的 `FrontendProject/TypeScript/AI/dist` 静态产物，避免继续代理旧前端容器导致浏览器拿到旧 JS。

#### 验证
- **类型检查**：通过 `npm run test`（`tsc --noEmit`）。
- **前端构建**：通过 `npm run build` 与 `npm run build:prod`。
- **本地部署**：已重新构建前端 `dist`，重启 `nginx` 与 `backend`。
- **访问验证**：`http://localhost/` 返回 HTTP 200，前端入口加载最新 `assets/index-BXAIhFUO.js`；`GET /api/livestream/douyin/status` 返回 `success`。

### 2026-09-02 抖音直播控制台与实时事件修复

#### 优化
- **直播模式布局**：抖音直播模式左侧虚拟人区域与右侧直播互动区域调整为 `1:3` 宽度比例，提升实时事件和策略面板可读性。
- **Toast 层级**：提高 Ant Design Message/Toast 层级，避免点击“连接直播间”后的成功、警告或错误提示被 Live2D 舞台和面板遮挡。
- **采集状态提示**：直播控制台新增采集传输方式提示，后端降级为 HTTP 轮询时显示 `HTTP轮询` 标识，并在空事件列表展示采集提示。
- **Python 后端采集**：确认抖音直播采集已从 dycast 独立服务重构为 Python 后端内置采集，Docker Compose 不再包含 `dycast` 服务，Nginx 不再配置 `/dycast/`、`/dylive/`、`/socket/`。
- **README 文档**：按实际代码口径补充内置直播控制台、OBS 舞台、Python 采集接口、WebSocket 降级和实时事件排障说明；移除 dycast 作为运行服务的说明。

#### 修复
- **抖音 WebSocket HTTP 200**：修复抖音上游返回 `server rejected WebSocket connection: HTTP 200` 后采集直接失败的问题；后端会自动切换到 `HTTP 轮询` 继续拉取事件。
- **实时事件不显示**：修复直播事件先进入 AI/TTS 自动回复流程导致接口被阻塞、控制台“实时事件”迟迟不刷新的问题；现在事件会先广播到控制台，再后台处理自动回复。
- **后端采集 Cookie**：抖音 WebSocket 握手时补充从直播间 HTTP 请求获得的 Cookie 和 Referer，提高上游连接成功率。
- **HTTP 轮询解码**：`im/fetch` 解码结果新增消息解析，HTTP 轮询模式下也能产出 WebcastChatMessage、WebcastMemberMessage、WebcastSocialMessage、WebcastLikeMessage 等事件。
- **错误文档更正**：撤销“补回 dycast Compose/Nginx 接入”的错误方向，恢复为 Python 后端采集架构。

#### 验证
- **构建部署**：已重新构建并启动 `backend`、`frontend`，重启 `nginx`。
- **页面访问**：`http://localhost/live/console` 返回 HTTP 200。
- **事件入口**：`POST /api/livestream/events` 返回 HTTP 200。
- **WebSocket 广播**：测试客户端连接 `ws://localhost/ws/livestream_console_verify` 后，可收到 `livestream.event_batch` 事件。
- **运行配置**：检查 `docker-compose.yml` 和 `nginx/nginx.conf`，当前运行配置无 dycast 服务和 `/dycast/`、`/dylive/`、`/socket/` 路由。

### 2026-09-01 Docker 部署与本地反向代理修复

> 注：本节中的 dycast 相关内容为重构前的历史排障记录；当前运行架构已在 2026-09-02 改为 Python 后端直接采集，不再启动 dycast 服务。

#### 优化
- **Tooltip 层级**：关系状态、停止当前语音、清空本地消息的 Tooltip 统一挂载到 `document.body`，向下展示并提升层级，避免被对话面板裁切。
- **dycast 子路径部署**：为抖音弹幕姬增加 `/dycast/` 子路径访问支持，Vite `base` 调整为 `/dycast/`，资源路径不再落到主前端。
- **dycast 容器运行方式**：dycast 镜像运行阶段保留源码并使用 Vite dev server，以继续支持 `/dylive` 和 `/socket` 开发代理能力。
- **Nginx 代理**：新增 `/dycast/`、`/dylive/`、`/socket/` 反向代理规则，统一从 `http://localhost/dycast/` 访问弹幕姬。
- **Docker 构建**：在 Docker Hub 拉取 `python:3.13-slim` 超时时，可使用镜像源拉取后打 tag 继续完成后端镜像重建。

#### 修复
- **直播控制台刷新**：修复刷新 `/live/console` 时 `./Core/live2dcubismcore.js` 被解析为 `/live/Core/live2dcubismcore.js` 导致 404 的问题；入口 HTML 改用 `/Core/live2dcubismcore.js` 绝对路径。
- **历史 Core 路径兼容**：Nginx 新增 `/live/Core/` 到前端 `/Core/` 的兼容代理，避免旧缓存或历史构建继续请求 404。
- **dycast 打不开**：修复 `http://localhost/dycast/` 被主前端接管或 dycast 容器缺少源码导致页面不可用的问题。
- **抖音直播信息代理 502**：修复 `/dylive/...` 经 Nginx 代理时因上游响应头过大导致 `upstream sent too big header` 的 502，增加代理响应头缓冲区。

#### 验证
- **前端访问**：`http://localhost/` 返回 HTTP 200。
- **后端访问**：`http://localhost:8000/` 与 `http://localhost/api/memories?...` 返回 HTTP 200。
- **直播控制台资源**：`/live/console`、`/Core/live2dcubismcore.js`、`/live/Core/live2dcubismcore.js` 均返回 HTTP 200。
- **dycast 访问**：`http://localhost/dycast/` 与 `http://localhost/dycast/src/main.ts` 返回 HTTP 200。
- **dylive 代理**：`http://localhost/dylive/893753183282` 不再返回 502。

### 2026-08-31 实时信息 MCP 与记忆时间线

#### 新增
- **MCP 实时工具**：新增内置 stdio MCP Server，提供 `get_current_time` 和 `get_weather_from_text` 两个工具。
- **实时上下文**：聊天时通过 MCP 获取当前日期、时间、星期；当用户询问天气时，自动识别城市并查询实时天气。
- **默认天气城市**：天气问题未指定城市时使用 `DEFAULT_WEATHER_LOCATION`，未配置时默认上海。
- **时间线模型**：新增 `timeline_events` 表，记录重要事件、待跟进事项和关系变化的来源、发生时间、记录时间、重要度和情绪/阶段。
- **每日对话时间线**：新增按天聚合的对话总结能力，合并当天会话摘要与重要 highlights。
- **时间线 API**：新增 `GET /api/timeline-events` 和 `GET /api/timeline-days`。

#### 优化
- **ASR 独立配置**：语音识别新增 `ASR_API_KEY`、`ASR_BASE_URL`、`ASR_MODEL`，不再和对话生成模型共用 `OPENAI_BASE_URL`；旧版 `SILICONFLOW_*` 配置保持兼容。
- **Prompt 记忆上下文**：系统提示词新增“按天整理的对话时间线”，让 AI 伴侣能基于每天的相处脉络回复。
- **记忆管理布局**：将“当前关系状态”和“置顶记忆”合并为“当前关系状态与置顶记忆”。
- **记忆管理布局**：将“待跟进事项”和“已完成跟进记录”合并为“待跟进事项与完成记录”。
- **记忆管理布局**：“当前关系状态与置顶记忆”放在左侧，“关系阶段统计”放在右侧，减少上下滚动和重复信息。
- **时间线展示**：将原“关系时间线”调整为“每日对话时间线”，以天为单位展示当天对话总结。

#### 修复
- **实时问题回答**：修复 AI 伴侣无法可靠回答“今天几号”“今天天气怎么样”等实时信息问题的问题。
- **记忆删除联动**：删除来源记忆时，同步清理对应时间线记录。

#### 验证
- **后端**：通过 `python3 -m py_compile` 检查新增 MCP、时间线、记忆相关模块。
- **前端**：通过 `npm run test`（`tsc --noEmit`）。


### 2026-08-29 多模态“摸摸我”手势互动

#### 新增
- **多模态聊天**：新增“摸摸我”按钮，并放置在“让我看看”按钮旁边
- **摄像头手势识别**：点击“摸摸我”后申请摄像头权限并启动 MediaPipe Hands
- **双手跟踪**：支持同时检测用户左手和右手，并分别在虚拟人物左侧和右侧显示对应小手
- **手部移动映射**：使用食指指尖坐标驱动屏幕小手移动，并通过线性插值降低抖动
- **摄像头预览**：手势互动开启后，在人物舞台显示带手部关键点的镜像预览
- **触碰随机动作**：小手命中虚拟人物后，从当前模型的 `TapBody` 和 `Idle` 动作中随机播放一次
- **本地 MediaPipe 资源**：构建时将 Hands WASM、TFLite 和运行资源复制到 `/mediapipe/hands/`，运行时不再依赖外部 CDN

#### 优化
- **按钮布局**：“摸摸我”从人物舞台右上角移动到多模态聊天快捷操作区，与“让我看看”相邻
- **左右手语义**：校正未镜像摄像头输入的 MediaPipe handedness，确保识别结果对应用户真实左右手
- **区域映射**：左右手分别映射到人物舞台左右区域，并保留中部重叠范围用于触碰人物
- **碰撞检测**：从单中心点检测升级为中心及周边多点采样，减少小手碰到人物边缘时的漏判
- **触发控制**：使用进入碰撞触发和冷却时间，避免小手持续接触人物时频繁重复播放动作
- **资源管理**：停止互动或离开页面时关闭摄像头、清理识别状态和 MediaPipe 实例
- **响应式样式**：适配窄屏下的小手尺寸、摄像头预览和快捷操作按钮布局

#### 修复
- **Live2D 动画**：修复触碰后动作已进入 MotionManager 队列、但动画更新开关未开启导致人物不执行动作的问题
- **单次动作**：触碰时显式停止旧动作并开启 MotionManager 更新，随机动作播放完成后自动停止
- **人物边缘碰撞**：修复视觉上小手已覆盖人物、但图标中心点未进入碰撞区而无法触发的问题

#### 验证
- **类型检查**：通过 `npm run test`（`tsc --noEmit`）
- **生产构建**：通过 `npm run build:prod` 和 Docker 前端镜像构建
- **本地部署**：`frontend`、`nginx` 容器运行正常，`http://localhost/advanced` 返回 HTTP 200
- **静态资源**：MediaPipe Hands JS、WASM 和 TFLite 本地地址均返回 HTTP 200
- **页面检查**：快捷按钮顺序为“语音输入 → 让我看看 → 摸摸我”，人物舞台不再重复显示按钮

### 2026-08-20 近期更新

#### 新增
- **伴侣设定**：AI 伴侣称呼不再固定为“小凡”，支持在“隐私与设置”中配置并持久化
- **伴侣设定**：支持自定义伴侣性格，并在后续对话中使用已保存设定
- **虚拟人物**：人物选择入口统一移动到设置页，首页和聊天页固定展示已确认人物
- **选妃弹窗**：使用真实 Live2D Canvas 渲染当前人物，不再使用图片缩略图
- **选妃弹窗**：每次只显示一个人物，新增“下一个”按钮循环预览
- **选妃弹窗**：新增“点他”确认操作，确认后持久化人物选择
- **长期记忆**：新增置顶记忆、自动记忆、已归档待办和关系历史管理
- **记忆 API**：新增记忆查询、创建、修改和删除接口

#### 优化
- **选妃弹窗**：将 Live2D Canvas 临时挂载到弹窗预览区域，关闭后恢复原位置和样式
- **选妃弹窗**：提高弹窗、遮罩和内容层级，确保弹窗显示在应用最上层
- **本地部署**：后端源码挂载到容器 `/app`，重新创建容器即可加载最新接口代码
- **Nginx**：API 反向代理保留 `/api` 前缀，与 FastAPI 路由定义保持一致

#### 修复
- **隐私与设置**：修复 `/api/memories` 被 Nginx 转发为 `/memories` 导致的 404
- **本地部署**：修复旧后端镜像不包含最新记忆接口的问题

#### 验证
- **前端**：通过 `npm test` TypeScript 类型检查
- **前端**：通过 `npm run build` 构建验证
- **接口**：置顶记忆、自动记忆、已归档待办和关系历史查询均返回 HTTP 200

### 新增
- **移动端**: 实现移动端语音录音与实时传输功能
- **移动端**: 添加 MediaRecorder 音频录制功能
- **移动端**: 集成麦克风录音及 WebSocket 推流
- **移动端**: 实现音频数据实时 base64 转换与传输
- **移动端**: 添加录音状态视觉反馈（红色背景与脉冲动画）
- **移动端**: 支持音频参数配置（16kHz采样率、单声道、回声消除、噪声抑制）
- **移动端**: 实现录音资源清理与麦克风权限管理
- **手势交互**: 实现全新的手势交互逻辑，伸出食指时显示小手光标
- **手势交互**: 小手碰到 Live2D 模型时随机播放动画
- **手势交互**: 添加食指指尖位置追踪功能（支持左右手独立追踪）
- **手势交互**: 实现坐标映射，将手指位置映射到 Live2D 模型区域
- **手势交互**: 添加碰撞检测功能，检测小手是否碰到模型碰撞区域
- **手势交互**: 实现动画完成回调机制，精确控制动画播放状态
- **手势交互**: 添加位置平滑处理（线性插值算法），减少手势抖动
- **手势交互**: 添加更新节流机制（50ms），避免过于频繁的 UI 更新
- **手势服务**: 扩展 HandGestureService，支持返回食指指尖坐标
- **手势服务**: 新增 FingerPosition 接口，存储手指屏幕坐标
- **手势服务**: 优化类型安全，修复 ESLint 类型错误
- **Live2D**: LAppSubdelegate 新增 getView() 公共方法
- **Docker**: 添加 Docker Compose 一键部署配置
- **Docker**: 添加前端 Dockerfile 支持多阶段构建
- **Docker**: 添加后端 Dockerfile 支持 Python 3.13
- **Docker**: 添加 Nginx 反向代理配置
- **Docker**: 优化前端资源复制脚本支持容器环境检测
- **Docker**: 添加各项目 Docker 忽略文件配置
- **Docker**: 添加抖音弹幕姬 Dockerfile 支持
- **Docker**: 集成抖音弹幕姬服务到 Docker Compose
- **Docker**: 配置 Nginx 反向代理抖音弹幕姬服务
- **Docker**: 添加抖音弹幕姬 WebSocket 和 API 代理配置
- **WebSocket**: 添加动画切换事件机制
- **Live2D**: 实现动画索引切换功能
- **图片**: 添加图片分析 prompt 参数传递功能
- **WebSocket**: 添加自动拍照功能支持
- **WebSocket**: 实现前端拍照指令监听
- **消息**: 支持图片消息转语音功能
- **消息**: 添加图片消息音频开关
- **WebSocket**: 添加图片消息音频状态字段
- **WebSocket面板**: 新增 is_audio 音频标识
- **组件**: 扩展图片消息数据结构
- **配置**: 新增 MODEL_TYPE 环境变量
- **LLM服务**: 支持智谱 AI 与 OpenAI 模型切换
- **LLM服务**: 新增智谱 AI 对话接口实现
- **配置**: 添加模型类型配置项
- **文档**: 添加 Star History 图表
- **文档**: 新增项目 Star 历史记录
- **文档**: 添加打赏赞助引导内容
- **文档**: 新增微信与支付宝收款码
- **文档**: 补充项目赞助支持说明

### 优化
- **移动端**: 修复移动端页面高度适配问题
- **移动端**: 优化全局消息提示显示位置
- **移动端**: 调整页面层级与样式结构
- **移动端**: 优化移动端页面布局适配竖版手机
- **手势交互**: 移除旧的手势同步逻辑（抬手/放下手臂）
- **手势交互**: 优化小手光标样式，使用 👋 emoji 替代 👆
- **手势交互**: 增强小手光标视觉效果，添加脉冲动画和阴影效果
- **手势交互**: 优化坐标转换逻辑，支持镜像翻转处理
- **手势交互**: 优化碰撞检测性能，使用 subdelegate 对象避免重复调用
- **手势服务**: 优化类型定义，将 landmarks 参数从 any[] 改为具体类型
- **手势服务**: 修复 Promise rejection reason 类型错误
- **手势服务**: 优化导出命名，符合 TypeScript 命名规范
- **Docker**: 将前端部署从 Nginx 迁移至 Node.js
- **Docker**: 更新前端 Dockerfile 基础镜像为 Node.js 23-alpine
- **Docker**: 配置 Nginx 前端服务反向代理规则
- **WebSocket**: 重构动画指令处理逻辑
- **主模块**: 优化用户消息处理逻辑
- **主模块**: 重构 prompt 参数获取方式
- **聊天**: 优化图片交互对话流程与角色设定
- **LLM**: 重构智谱 AI 初始化与提示词逻辑
- **WebSocket**: 优化图片消息处理逻辑
- **消息处理**: 优化图片消息处理逻辑
- **LLM服务**: 重构 LLM 客户端初始化逻辑
- **文档**: 优化支付图片展示布局格式

### 修复
- **主模块**: 修复消息历史记录空值问题
- **WebSocket**: 修复拍照时音频状态丢失问题
- **相机**: 修复拍照流程 audioEnabled 状态错误
- **前端**: 修复拍照传递音频状态参数问题

### 文档
- **README**: 完善 Docker 部署文档与配置说明
- **README**: 完善项目文档与技术栈说明
- **README**: 新增部署指南与常见问题解答
- **README**: 更新项目结构与功能特性描述
- **README**: 更新项目文档与架构说明
- **README**: 补充智能功能与技术栈说明
- **README**: 完善开发指南与性能建议
- **README**: 更新 README 示例环境限制说明
- **README**: 新增抖音弹幕姬使用说明
- **README**: 更新抖音直播互动功能文档
- **部署文档**: 新增抖音弹幕姬服务说明
- **部署文档**: 添加抖音弹幕姬故障排查指南
- **部署文档**: 更新服务列表和访问地址

### 其他
- **配置**: 修改后端服务地址为本地环境
- **配置**: 更新 .env.example 配置文件
- **子模块**: 添加抖音弹幕姬（dycast）作为 Git 子模块
- **子模块**: 添加 Live2D Core 子模块配置
- **README**: 新增抖音弹幕姬使用说明
- **README**: 更新抖音直播互动功能文档
- **部署文档**: 新增抖音弹幕姬服务说明
- **部署文档**: 添加抖音弹幕姬故障排查指南
- **部署文档**: 更新服务列表和访问地址

### 其他
- **配置**: 修改后端服务地址为本地环境
- **配置**: 更新 .env.example 配置文件
- **子模块**: 添加抖音弹幕姬（dycast）作为 Git 子模块
- **子模块**: 添加 Live2D Core 子模块配置
- **README**: 新增抖音弹幕姬使用说明
- **README**: 更新抖音直播互动功能文档
- **部署文档**: 新增抖音弹幕姬服务说明
- **部署文档**: 添加抖音弹幕姬故障排查指南
- **部署文档**: 更新服务列表和访问地址

### 其他
- **配置**: 修改后端服务地址为本地环境
- **配置**: 更新 .env.example 配置文件
- **子模块**: 添加抖音弹幕姬（dycast）作为 Git 子模块
- **子模块**: 添加 Live2D Core 子模块配置

---

## 版本说明

### 新增 (Added)
- 新功能
- 新特性

### 优化 (Changed)
- 现有功能的变更
- 代码重构和性能优化

### 修复 (Fixed)
- Bug 修复

### 移除 (Removed)
- 功能移除

### 废弃 (Deprecated)
- 即将移除的功能

### 安全 (Security)
- 安全相关的修复
