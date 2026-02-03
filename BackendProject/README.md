# WebSocket 音频+文本+图片处理服务器

这是一个支持同时处理音频流、文本消息和图片消息的WebSocket服务器，基于FastAPI构建。

## 功能特性

- ✅ 同时支持音频流和文本消息处理
- ✅ 实时音频数据接收和处理
- ✅ 音频文件本地保存
- ✅ SiliconFlow语音识别（ASR）
- ✅ AI对话功能（集成LangChain + OpenAI）
- ✅ TTS语音合成功能
- ✅ Live2D动画控制
- ✅ 客户端连接管理
- ✅ 消息历史记录
- ✅ 图片消息处理（集成智谱AI GLM-4V-Flash）
- ✅ 图片内容智能分析
- ✅ 支持多种图片格式（JPEG/PNG/GIF/WEBP）

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
├── test_client.html     # 浏览器测试客户端
├── test_websocket.py    # Python测试脚本
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

### 6. 动画控制消息
```json
{
  "type": "animation",
  "data": {
    "animation_no": 1,
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```

### 7. 拍照控制消息
```json
{
  "type": "photo",
  "data": {
    "action": "take_photo",
    "timestamp": "2024-01-01T12:00:00Z",
    "client_id": "user123"
  }
}
```



## API端点

- `GET /` - 健康检查
- `GET /hello/{name}` - 测试接口
- `WebSocket /ws/{client_id}` - WebSocket连接端点

## 支持的Live2D模型

- Hiyori (1-8号动画)
- Haru (1-2号动画)  
- Mark (3-4号动画)
- Natori (5-6号动画)
- Rice (1-3号动画)
- Mao (2-4号动画)
- Wanko (1-3号动画)

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
- 集成OpenAI GPT模型
- 支持对话历史记录
- 自动情绪识别和动画匹配
- 可选TTS语音回复

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
5. 服务端处理文本并返回AI回复
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
2. **处理器层** (handlers/) - 负责业务逻辑处理
   - audio_handler.py - 音频处理和语音识别
   - image_handler.py - 图片处理和分析
3. **服务层** (services/) - 负责外部服务调用
   - llm_service.py - 大模型服务（OpenAI + 智谱AI）
   - http_service.py - HTTP请求服务（TTS、语音识别等）

### 优势
- **职责分离**: 每层专注于自己的职责，代码更清晰
- **代码复用**: 服务层统一管理外部调用，避免重复代码
- **易于维护**: 修改API调用逻辑只需在服务层修改
- **易于测试**: 各层可以独立进行单元测试
- **扩展性强**: 新增功能只需在对应层添加代码

## 许可证

MIT License
