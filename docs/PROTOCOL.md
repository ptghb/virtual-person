# 协议文档

## 1. 协议概览

| 接口 | 协议 | 方向 | 用途 |
| --- | --- | --- | --- |
| `/` | HTTP GET | 客户端 → 后端 | 基础探活，返回 Hello World |
| `/hello/{name}` | HTTP GET | 客户端 → 后端 | 示例接口 |
| `/ws/{client_id}` | WebSocket | 双向 | 文字、音频、图片、控制、直播弹幕 |
| EasyVoice `/api/v1/tts/generate` | HTTP POST | 后端 → TTS | 文本转语音 |
| SiliconFlow `/v1/audio/transcriptions` | HTTP multipart POST | 后端 → ASR | 语音转文字 |
| AI Chat Completions | SDK/HTTP | 后端 → AI | 文本、动作判断、拍照判断、图片分析 |

当前协议没有版本号、认证字段、请求 ID 和统一错误码。下述内容描述现有实现，而非理想协议。

## 2. WebSocket 连接

### 2.1 地址

```text
ws://<host>:8000/ws/<client_id>
wss://<domain>/ws/<client_id>
```

### 2.2 client_id 约定

| 前缀 | 发送方/用途 |
| --- | --- |
| `client_` | 桌面首页 |
| `mobile_user_` | 移动端页面 |
| `livestream_user_` | 直播展示页；后端直播广播目标 |
| 其他 | 后端不限制，作为普通连接 |

注意：此前缀只是命名约定，不是安全角色认证。

### 2.3 建连后欢迎消息

```json
{
  "type": 1,
  "content": "你好，我是你的好朋友，小凡...",
  "audio": ""
}
```

## 3. 客户端到后端：统一信封

除 dycast 数组外，消息结构为：

```json
{
  "type": "text",
  "data": {}
}
```

### 3.1 type 枚举

| type | 状态 | 说明 |
| --- | --- | --- |
| `text` | 已实现 | 文字对话 |
| `audio` | 已实现 | 音频分块 |
| `control` | 已实现 | 开始/停止音频流 |
| `image` | 已实现 | Base64 图片 |
| `comment` | 后端支持 | 包装后的直播消息；dycast 实际直接发送数组 |
| `response` | 类型中声明 | 主要用于后端响应，不应作为业务请求 |

## 4. 文字消息

### 4.1 请求

```json
{
  "type": "text",
  "data": {
    "content": "今天心情不太好",
    "model": "Hiyori",
    "is_audio": true,
    "has_image": false,
    "timestamp": "2026-08-14T06:00:00.000Z",
    "client_id": "client_..."
  }
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `content` | string | 是 | 无 | 空字符串返回错误 |
| `model` | string | 否 | `Hiyori` | 用于选择动作 |
| `is_audio` | boolean | 否 | `false` | 是否为本次回复生成 TTS |
| `has_image` | boolean | 否 | `false` | 为真时跳过拍照判断 |
| `timestamp` | ISO string | 否 | - | 后端当前不使用 |
| `client_id` | string | 否 | - | 后端以 URL 参数为准 |

前端兼容旧调用：

```ts
wsManager.send({ text, model, isAudio })
```

发送前会转换成上述统一信封。

### 4.2 成功响应

```json
{
  "type": 1,
  "content": "小凡: 抱抱你，愿意和我说说发生了什么吗？",
  "audio": "https://example.com/audio/xxx.mp3",
  "animation_index": 1,
  "should_take_photo": false,
  "prompt": "今天心情不太好"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | integer | `1` 表示文字业务消息 |
| `content` | string | UI 展示文本 |
| `audio` | string/null | TTS URL；未启用时通常为空字符串 |
| `animation_index` | integer | Live2D 动作序号 |
| `should_take_photo` | boolean | 是否要求客户端拍照 |
| `prompt` | string/null | 自动拍照后随图片回传的问题 |

### 4.3 错误响应

```json
{
  "type": "response",
  "data": {
    "status": "error",
    "message": "文本内容为空",
    "request_type": "text"
  }
}
```

## 5. 图片消息

### 5.1 请求

```json
{
  "type": "image",
  "data": {
    "image": "<base64，不含 data:image/... 前缀>",
    "format": "jpeg",
    "is_audio": true,
    "prompt": "你看看我的气色怎么样",
    "timestamp": "2026-08-14T06:00:00.000Z",
    "client_id": "client_..."
  }
}
```

支持格式：JPEG、PNG、GIF、WEBP。`format` 仅作描述，后端会根据实际字节验证。

### 5.2 成功响应

与文字成功响应相同，但当前固定：

- `animation_index = 0`；
- `should_take_photo = false`；
- `prompt = null`。

图片处理失败时，当前处理函数通常只记录日志，不一定向客户端发送失败响应。

## 6. 音频流消息

### 6.1 开始

```json
{
  "type": "control",
  "data": {
    "action": "start_audio_stream",
    "timestamp": "2026-08-14T06:00:00.000Z",
    "client_id": "mobile_user_..."
  }
}
```

响应：

```json
{
  "type": "response",
  "data": {
    "status": "success",
    "message": "音频流已启动",
    "request_type": "control"
  }
}
```

### 6.2 音频块

```json
{
  "type": "audio",
  "data": {
    "audioFormat": "pcm",
    "sample_rate": 16000,
    "channels": 1,
    "chunk": "<base64>",
    "is_final": false,
    "timestamp": "2026-08-14T06:00:00.100Z",
    "client_id": "mobile_user_..."
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `audioFormat` | `pcm/wav/mp3` | 前端当前发送 `pcm`，后端不校验 |
| `sample_rate` | integer | 前端填写 16000，后端不使用 |
| `channels` | integer | 前端填写 1，后端不使用 |
| `chunk` | string | Base64 音频块 |
| `is_final` | boolean | 后端仅回显，不据此自动结束 |

**实际编码说明**：当前浏览器录音器配置为 `audio/webm;codecs=opus`，因此 `audioFormat="pcm"` 不是事实上的编码声明。

后端会构造音频块响应，但当前代码没有发送该响应。

### 6.3 停止

客户端先发送一个 `chunk=""、is_final=true` 的音频消息，再发送：

```json
{
  "type": "control",
  "data": {
    "action": "stop_audio_stream",
    "timestamp": "2026-08-14T06:00:10.000Z",
    "client_id": "mobile_user_..."
  }
}
```

后端处理顺序：

1. 拼接已有块并调用 ASR；
2. 直接发送一次纯文本识别结果；
3. 把识别结果作为 `text` 请求进入 AI 对话；
4. 发送控制成功响应。

因此停止操作可能收到三条消息，且第一条不是 JSON：

```text
识别到的文本
```

```json
{
  "type": 1,
  "content": "小凡: ...",
  "audio": "...",
  "animation_index": 1,
  "should_take_photo": false,
  "prompt": "识别到的文本"
}
```

```json
{
  "type": "response",
  "data": {
    "status": "success",
    "message": "音频流已停止，识别结果: ...",
    "request_type": "control",
    "transcription": "..."
  }
}
```

## 7. 控制消息

| action | 已实现 | 说明 |
| --- | --- | --- |
| `start_audio_stream` | 是 | 初始化该 client 的音频缓冲 |
| `stop_audio_stream` | 是 | ASR 并触发 AI 对话 |
| `ping` | 否 | 前端类型声明，但后端会返回未知动作 |
| `pong` | 否 | 前端类型声明，但后端会返回未知动作 |

未知动作响应：

```json
{
  "type": "response",
  "data": {
    "status": "error",
    "message": "未知的控制动作: ping",
    "request_type": "control"
  }
}
```

## 8. dycast 弹幕转发协议

### 8.1 首条直播间信息

dycast 转发 WebSocket 建连后会先发送：

```json
{
  "roomNum": "123456",
  "roomId": "...",
  "uniqueId": "...",
  "avatar": "...",
  "cover": "...",
  "nickname": "...",
  "title": "...",
  "status": 2
}
```

当前 FastAPI 不处理此对象。

### 8.2 消息批次

```json
[
  {
    "id": "message-id",
    "method": "WebcastChatMessage",
    "user": {
      "id": "user-id",
      "name": "观众名",
      "avatar": "https://...",
      "gender": 0
    },
    "content": "你好",
    "gift": null,
    "room": {
      "audienceCount": 100,
      "likeCount": 1000,
      "followCount": 200,
      "totalUserCount": 300,
      "status": 2
    }
  }
]
```

后端收到顶层数组后自动视为：

```json
{
  "type": "comment",
  "data": {
    "comments": ["..."]
  }
}
```

### 8.3 method 枚举

| method | 后端业务处理 |
| --- | --- |
| `WebcastChatMessage` | 聚合后调用 AI/TTS |
| `WebcastMemberMessage` | 生成欢迎语 |
| `WebcastSocialMessage` | 生成感谢关注 |
| `WebcastLikeMessage` | 生成感谢点赞 |
| `WebcastGiftMessage` | 当前仅统计/忽略，无回复 |
| `WebcastEmojiChatMessage` | dycast 可解析，后端未作为聊天处理 |
| `WebcastRoomUserSeqMessage` | 忽略 |
| `WebcastControlMessage` | 忽略 |
| `WebcastRoomRankMessage` | 忽略 |
| `WebcastRoomStatsMessage` | 忽略 |

直播处理完成后的确认响应当前被注释，不会发给 dycast；业务回复发送给所有 `livestream_user_*` 连接。

## 9. TTS 协议

请求：

```http
POST {TTS_API_URL}/api/v1/tts/generate
Content-Type: application/json
```

```json
{
  "text": "需要合成的文本",
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "0%",
  "pitch": "0Hz",
  "volume": "0%"
}
```

期望响应：

```json
{
  "success": true,
  "data": {
    "audio": "/某个音频路径"
  }
}
```

最终给浏览器的 URL 为：`AUDIO_URL + data.audio`。

## 10. ASR 协议

```http
POST https://api.siliconflow.cn/v1/audio/transcriptions
Authorization: Bearer {SILICONFLOW_API_KEY}
Content-Type: multipart/form-data
```

Multipart：

- `file`: 本地录音文件；
- `model`: `FunAudioLLM/SenseVoiceSmall`。

期望响应：

```json
{
  "text": "识别结果"
}
```

## 11. 建议的下一版协议

建议新增版本化统一信封：

```json
{
  "version": "1.0",
  "id": "request-uuid",
  "type": "chat.text",
  "timestamp": "2026-08-14T06:00:00Z",
  "data": {}
}
```

统一响应：

```json
{
  "version": "1.0",
  "id": "response-uuid",
  "reply_to": "request-uuid",
  "type": "chat.reply",
  "status": "success",
  "data": {},
  "error": null
}
```

并补充：

- 显式 `room_id/session_id`；
- 服务端确认的 `client_id` 和角色；
- 音频真实 MIME、序号、总字节数和校验值；
- 流式状态 `started/chunk/finished/failed`；
- 稳定错误码；
- 最大消息大小和版本兼容规则。
