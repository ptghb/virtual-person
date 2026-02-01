# WebSocket 通信协议设计

## 消息格式

### 1. 文本消息
```json
{
  "type": "text",
  "data": {
    "content": "你好，小凡！",
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
    "format": "pcm",  // 音频格式: pcm, wav, mp3等
    "sample_rate": 16000,
    "channels": 1,
    "chunk": "base64_encoded_audio_chunk",
    "is_final": false,  // 是否为最后一块音频数据
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
    "format": "jpeg",  // 图片格式: jpeg, png, gif, webp等
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
    "action": "start_audio_stream",  // 或 "stop_audio_stream", "ping", "pong"
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
    "status": "success",  // 或 "error"
    "message": "操作成功",
    "request_type": "audio",  // 对应的请求类型
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 数据传输流程

1. 客户端发送控制消息开始音频流
2. 客户端分块发送音频数据
3. 服务端实时处理音频并返回响应
4. 客户端发送文本消息
5. 服务端处理文本并返回AI回复
6. 客户端发送控制消息结束音频流

## 音频处理规范

- 支持PCM、WAV格式
- 采样率: 16000Hz
- 单声道
- 分块大小: 1024字节
- 实时处理延迟: < 200ms

## 图片处理规范

- 支持JPEG、PNG、GIF、WEBP格式
- Base64编码传输
- 最大图片大小: 10MB
- 使用GLM-4V-Flash模型进行图片理解
- 分析结果将打印到服务端日志