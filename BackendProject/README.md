# WebSocket 音频+文本+图片处理服务器

这是一个支持同时处理音频流、文本消息和图片消息的WebSocket服务器，基于FastAPI构建。

## 功能特性

### 核心功能
- ✅ 同时支持音频流和文本消息处理
- ✅ 实时音频数据接收和处理
- ✅ 音频文件本地保存
- ✅ SiliconFlow语音识别（ASR）
- ✅ AI对话功能（集成LangChain + OpenAI/智谱AI）
- ✅ TTS语音合成功能
- ✅ Live2D动画控制
- ✅ 客户端连接管理
- ✅ 消息历史记录
- ✅ 图片消息处理（集成智谱AI GLM-4V-Flash）
- ✅ 图片内容智能分析
- ✅ 支持多种图片格式（JPEG/PNG/GIF/WEBP）

### 智能功能
- ✅ 根据对话内容自动匹配Live2D动画
- ✅ 智能判断是否需要拍照
- ✅ 表情符号过滤（TTS前自动移除）
- ✅ 支持多种大模型（OpenAI/智谱AI）
- ✅ 多模型动画索引映射

## 项目结构

```
BackendProject/
├── main.py              # 主服务器文件
├── handlers/            # 处理器模块
│   ├── __init__.py
│   ├── audio_handler.py # 音频处理模块
│   └── image_handler.py # 图片处理模块
├── services/            # 服务层
│   ├── __init__.py
│   ├── llm_service.py   # 大模型服务（OpenAI + 智谱AI）
│   └── http_service.py  # HTTP请求服务
├── requirements.txt     # 依赖包列表
└── README.md           # 说明文档
```

## 安装依赖

```bash
pip install -r requirements.txt
```

## 环境配置

创建 `.env` 文件：

```env
# OpenAI API 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# SiliconFlow 语音识别API配置
SILICONFLOW_API_KEY=your_siliconflow_api_key

# 智谱AI GLM-4V API配置
ZHIPUAI_API_KEY=your_actual_zhipuai_api_key_here

# TTS服务配置
TTS_API_URL=http://localhost:3000
ISAUDIO=true

# 大模型类型选择（可选：openai 或 zhipu，默认：openai）
MODEL_TYPE=openai
```

## 启动服务器

```bash
python main.py
```

服务器将在 `http://localhost:8000` 启动

## 通信协议

### 1. 文本消息
```json
{
  "type": "text",
  "data": {
    "content": "你好，小凡！",
    "model": "Hiyori",
    "is_audio": true,
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

### 2. 音频消息
```json
{
  "type": "audio",
  "data": {
    "format": "pcm",
    "sample_rate": 16000,
    "channels": 1,
    "chunk": "base64_encoded_audio_data",
    "is_final": false,
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

### 3. 图片消息
```json
{
  "type": "image",
  "data": {
    "image": "base64_encoded_image_data",
    "format": "jpeg",
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

### 4. 控制消息
```json
{
  "type": "control",
  "data": {
    "action": "start_audio_stream",
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

### 5. 服务端响应
```json
{
  "type": "response",
  "data": {
    "status": "success",
    "message": "操作成功",
    "request_type": "audio",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### 6. AI回复消息（扩展字段）
```json
{
  "type": 1,
  "content": "小凡: 你好！",
  "audio": "/voice/audio_123.wav",
  "animation_index": 2,
  "should_take_photo": false
}
```

**字段说明：**
- `type`: 消息类型（1:文字，2:图片，3:音频）
- `content`: 消息内容
- `audio`: 音频文件URL（可选）
- `animation_index`: Live2D动画索引（可选，根据对话内容自动匹配）
- `should_take_photo`: 是否需要拍照（可选，根据对话内容智能判断）

## 测试方法

### 手动测试
使用WebSocket客户端工具连接到 `ws://localhost:8000/ws/your_client_id`

## API端点

- `GET /` - 健康检查
- `GET /hello/{name}` - 测试接口
- `WebSocket /ws/{client_id}` - WebSocket连接端点

## 支持的Live2D模型

### 动画索引映射规则

**Hiyori**
- 轻松愉快: 1, 2
- 严肃: 3
- 悲伤: 7, 8

**Haru**
- 轻松愉快: 1, 2
- 严肃: 1, 2
- 悲伤: 1, 2

**Mark**
- 轻松愉快: 3, 4
- 严肃: 3, 4
- 悲伤: 3, 4

**Natori**
- 轻松愉快: 5, 6
- 严肃: 5, 6
- 悲伤: 5, 6

**Rice**
- 轻松愉快: 2
- 严肃: 3
- 悲伤: 1

**Mao**
- 轻松愉快: 4
- 严肃: 3
- 悲伤: 2

**Wanko**
- 轻松愉快: 1
- 严肃: 3
- 悲伤: 2

## 开发说明

### 音频处理
- 支持PCM、WAV格式
- 采样率: 16000Hz
- 单声道
- 分块大小: 1024字节
- Base64编码传输
- 自动保存到本地文件
- 集成SiliconFlow语音识别
- 识别结果自动传递给AI对话系统
- 实时处理延迟: < 200ms

### 文本处理
- 集成OpenAI GPT模型或智谱AI GLM模型
- 支持对话历史记录
- 自动情绪识别和动画匹配
- 可选TTS语音回复
- 表情符号自动过滤（TTS前）
- 智能拍照判断

### 图片处理
- 支持JPEG、PNG、GIF、WEBP格式
- Base64编码传输
- 最大图片大小: 10MB
- 使用GLM-4V-Flash模型进行图片理解
- 分析结果将打印到服务端日志
- 自动将AI描述作为聊天消息发送给客户端

### 数据传输流程
1. 客户端发送控制消息开始音频流
2. 客户端分块发送音频数据
3. 服务端实时处理音频并返回响应
4. 客户端发送文本消息
5. 服务端处理文本并返回AI回复（包含动画索引和拍照判断）
6. 客户端发送图片消息
7. 服务端分析图片并返回AI描述
8. 客户端发送控制消息结束音频流

## 日志输出示例

### 音频处理日志
```
[AudioProcessor] 接收到音频数据，大小: 1024 字节
[AudioProcessor] 音频格式验证通过: PCM
[AudioProcessor] 语音识别完成: 你好，小凡！[AudioProcessor] 识别时间: 2024-01-01 12:00:00
```

### 图片处理日志
```
[ImageProcessor] 接收到图片数据，大小: 153600 字节
[ImageProcessor] 图片格式验证通过: JPEG
[ImageProcessor] GLM-4V-Flash分析完成
[ImageProcessor] 图片分析结果: 这是一张包含红色背景和蓝色正方形的测试图片，中央有一个黄色圆形...
[ImageProcessor] 分析时间: 2024-01-01 12:00:00
```

## 故障排除

1. **连接失败**: 检查服务器是否正常运行
2. **音频处理异常**: 确认音频格式正确（PCM/WAV，16000Hz，单声道）
3. **AI回复失败**: 检查OpenAI API密钥和网络连接
4. **TTS失败**: 确认TTS服务地址正确
5. **语音识别失败**: 检查SILICONFLOW_API_KEY是否正确配置
6. **音频文件未保存**: 检查目录权限和磁盘空间
7. **图片处理失败**: 检查ZHIPUAI_API_KEY是否正确配置
8. **图片格式不支持**: 确认图片格式为JPEG/PNG/GIF/WEBP
9. **图片过大**: 建议图片大小不超过10MB
10. **Base64解码失败**: 确认图片数据正确编码

## 架构说明

### 分层架构
项目采用三层架构设计：
1. **路由层** (main.py) - 负责请求路由和响应处理
   - WebSocket连接管理（ConnectionManager）
   - 消息分发和处理
   - 客户端消息历史记录管理
2. **处理器层** (handlers/) - 负责业务逻辑处理
   - audio_handler.py - 音频处理和语音识别
     - AudioProcessor: 音频流处理、文件保存、语音识别
     - MessageParser: WebSocket消息解析
   - image_handler.py - 图片处理和分析
     - ImageProcessor: 图片解码、格式验证、AI分析
3. **服务层** (services/) - 负责外部服务调用
   - llm_service.py - 大模型服务（OpenAI + 智谱AI）
     - LLMService: 对话、图片分析、动画索引获取、拍照判断
   - http_service.py - HTTP请求服务（TTS、语音识别等）
     - HTTPService: 通用HTTP请求封装、TTS生成、语音识别

### 优势
- **职责分离**: 每层专注于自己的职责，代码更清晰
- **代码复用**: 服务层统一管理外部调用，避免重复代码
- **易于维护**: 修改API调用逻辑只需在服务层修改
- **易于测试**: 各层可以独立进行单元测试
- **扩展性强**: 新增功能只需在对应层添加代码
- **多模型支持**: 支持OpenAI和智谱AI两种大模型，可灵活切换

## 技术栈

### 后端框架
- **FastAPI**: 现代化的Python Web框架，支持异步处理
- **Uvicorn**: ASGI服务器，用于运行FastAPI应用
- **WebSockets**: 实时双向通信协议

### AI与机器学习
- **LangChain**: 大语言模型应用开发框架
- **OpenAI API**: GPT模型对话服务
- **智谱AI GLM**: GLM-4V-Flash图片分析、GLM-4.7对话服务
- **SiliconFlow**: SenseVoiceSmall语音识别服务

### 数据处理
- **Pillow (PIL)**: 图片处理和格式验证
- **NumPy**: 数值计算支持
- **base64**: 数据编码解码
- **emoji**: 表情符号处理

### 工具库
- **python-dotenv**: 环境变量管理
- **httpx**: 异步HTTP客户端
- **aiofiles**: 异步文件操作
- **python-multipart**: 多部分表单数据处理

## 开发指南

### 添加新的Live2D模型
1. 在 `llm_service.py` 的 `get_animation_index` 方法中添加模型名称和动画映射规则
2. 更新 README.md 中的模型支持列表
3. 测试不同对话场景下的动画匹配效果

### 切换大模型提供商
在 `.env` 文件中设置 `MODEL_TYPE` 环境变量：
```env
# 使用OpenAI
MODEL_TYPE=openai

# 使用智谱AI
MODEL_TYPE=zhipu
```

### 自定义TTS参数
修改 `http_service.py` 中的 `generate_tts_audio` 方法参数：
```python
json_data={
    "text": text,
    "voice": "zh-CN-XiaoxiaoNeural",  # 语音类型
    "rate": "0%",                       # 语速调整
    "pitch": "0Hz",                     # 音调调整
    "volume": "0%"                      # 音量调整
}
```

### 扩展拍照判断逻辑
在 `llm_service.py` 的 `should_take_photo` 方法中修改系统提示词，添加新的判断规则。

## 性能优化建议

1. **音频处理**: 使用流式处理减少内存占用
2. **图片处理**: 添加图片大小限制，防止内存溢出
3. **并发控制**: 使用连接池管理HTTP请求
4. **缓存策略**: 对频繁访问的AI回复进行缓存
5. **日志优化**: 生产环境关闭DEBUG级别日志

## 安全建议

1. **API密钥保护**: 使用环境变量存储敏感信息，不要提交到代码仓库
2. **CORS配置**: 生产环境应指定具体的允许来源域名
3. **输入验证**: 对所有用户输入进行严格验证和清理
4. **速率限制**: 添加API调用频率限制，防止滥用
5. **HTTPS**: 生产环境使用HTTPS加密传输

## 许可证

MIT License
