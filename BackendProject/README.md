# WebSocket 音频+文本处理服务器

这是一个支持同时处理音频流和文本消息的WebSocket服务器，基于FastAPI构建。

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

## 项目结构

```
BackendProject/
├── main.py              # 主服务器文件
├── audio_handler.py     # 音频处理模块
├── protocol.md          # 通信协议文档
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

### 3. 控制消息
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

## 测试方法

### 1. 使用浏览器测试客户端
打开 `test_client.html` 文件，在浏览器中测试各种功能。

### 2. 使用Python测试脚本
```bash
python test_websocket.py
```

### 3. 手动测试
使用WebSocket客户端工具连接到 `ws://localhost:8000/ws/your_client_id`

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
- Base64编码传输
- 自动保存到本地文件
- 集成SiliconFlow语音识别
- 识别结果自动传递给AI对话系统

### 文本处理
- 集成OpenAI GPT模型
- 支持对话历史记录
- 自动情绪识别和动画匹配
- 可选TTS语音回复

## 故障排除

1. **连接失败**: 检查服务器是否正常运行
2. **音频处理异常**: 确认音频格式正确
3. **AI回复失败**: 检查OpenAI API密钥和网络连接
4. **TTS失败**: 确认TTS服务地址正确
5. **语音识别失败**: 检查SILICONFLOW_API_KEY是否正确配置
6. **音频文件未保存**: 检查目录权限和磁盘空间

## 许可证

MIT License