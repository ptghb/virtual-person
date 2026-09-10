# 情绪系统架构文档

> 本文档详细描述小凡 AI 情绪系统的设计、实现与调试方式。

## 1. 概述

情绪系统是小凡 AI 的核心特性之一，让虚拟伴侣的 Live2D 表情和动作能根据对话内容自动切换，使交互更加生动自然。

**解决的核心问题**：传统虚拟形象表情固定或随机切换，与对话内容脱节。情绪系统通过分析用户输入文本，驱动 AI 回复语气、Live2D 表情和动画三者联动。

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                         后端 (FastAPI)                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            analyze_companion_emotion()              │   │
│  │  关键词匹配 → 情绪选择 → 衰减计算 → 状态更新         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│         ┌───────────────┼───────────────┐                 │
│         │               │               │                   │
│    handle_text_    handle_image_   handle_comment_          │
│      message()      message()      message()               │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     send_personal_message() /                       │   │
│  │     send_livestream_assistant_message()             │   │
│  │  → WebSocket: assistant.meta (含 emotion 字段)      │   │
│  │  → WebSocket: type=1 消息 (携带 emotion 字段)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  emotion_states 表    │  │  timeline_events 表       │   │
│  │  (SQLite 持久化)      │  │  (情绪事件记录)           │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  emotion_decay_loop() — 每 30s 后台衰减              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React + Live2D)                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            websocketmanager.ts                       │   │
│  │  解析 assistant.meta / type=1 中的 emotion 字段      │   │
│  │  → 派发 companion-emotion 事件                       │   │
│  │  → 派发 change-animation 事件                         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  DigitalHumanStage.tsx                               │   │
│  │  • 500ms 防抖：相同情绪 + 强度差 < 0.1 则跳过       │   │
│  │  • setExpression() → 切换 Live2D 表情               │   │
│  │  • playMotion() → 切换 Live2D 动画                   │   │
│  │  • Emoji 图标 + 强度进度条展示                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EmotionDebugPanel.tsx (?debugEmotion=true)         │   │
│  │  • 手动选择情绪 + 调整强度                           │   │
│  │  • 情绪历史曲线图 (SVG)                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 3. 情绪状态机

### 3.1 情绪定义

系统支持 10 种情绪状态：

| Emotion Key | 中文标签 | 触发场景 |
|-------------|---------|---------|
| `neutral` | 平静 | 默认状态，无情绪触发 |
| `happy` | 开心 | 用户表达开心、感谢或积极反馈 |
| `shy` | 害羞 | 用户表达亲密、夸奖或暧昧互动 |
| `sad` | 难过 | 用户表达难过、伤心或失落 |
| `worried` | 担心 | 用户表达疲惫、焦虑或压力 |
| `wronged` | 委屈 | 用户显得冷淡或提到忽略陪伴 |
| `angry` | 生气 | 用户语气有明显冲突或攻击性 |
| `comforting` | 想安慰用户 | 检测到用户需要安慰（由 AI 回复语气体现） |
| `playful` | 调皮撒娇 | 用户在轻松玩笑或撒娇 |
| `sleepy` | 困倦 | 用户提到睡觉或晚安场景 |

### 3.2 关键词规则 (`EMOTION_RULES`)

每条规则包含：情绪类型、强度增量 (boost)、触发原因、关键词列表。

| 情绪 | Boost | 关键词示例 |
|------|-------|-----------|
| worried | 0.52 | 累, 疲惫, 压力, 难受, 焦虑, 害怕, 紧张, 睡不着, 生病, 头疼, 加班, 崩溃 |
| sad | 0.55 | 难过, 伤心, 想哭, 哭了, 失落, 孤独, 委屈死了, 不开心, 沮丧 |
| shy | 0.45 | 喜欢你, 爱你, 亲亲, 抱抱, 老婆, 宝贝, 可爱, 想你, 贴贴 |
| wronged | 0.38 | 忘了你, 不理你, 好久没来, 以后再说, 别烦, 一边去 |
| angry | 0.35 | 讨厌你, 闭嘴, 烦死了, 你真没用, 滚, 别理我 |
| happy | 0.36 | 哈哈, 开心, 真好, 谢谢, 太棒了, 好耶, 舒服了, 好多了, 不错, 厉害 |
| playful | 0.32 | 嘿嘿, 哼, 逗你, 开玩笑, 撒娇, 摸摸, 捏捏 |
| sleepy | 0.34 | 晚安, 困了, 睡觉, 想睡, 熬夜 |

### 3.3 衰减机制

情绪状态有两层衰减：

**对话轮衰减**（`analyze_companion_emotion` 内）：
- 每轮对话将上一轮的强度乘以 **0.85**
- 如果衰减后强度 < 0.2，情绪自动回退到 `neutral`
- 新关键词触发时，在 `max(decayed_intensity, 0.2) + boost` 基础上计算

**后台定时衰减**（`emotion_decay_loop`）：
- 每 **30 秒** 扫描所有会话的情绪状态
- 非 neutral 情绪的强度乘以 **0.90**
- 强度低于 **0.15** 时自动重置为 neutral
- 约束：从满强度衰减到 0.2 以下约需 5 分钟

### 3.4 情绪 Prompt 注入 (`build_emotion_prompt_context`)

当情绪非 neutral 且强度 ≥ 0.2 时，向系统提示词追加：

```
【当前短期情绪状态】
你现在的情绪是：{emotion_label}，强度 {intensity}。
原因：{reason}。
请让回复语气自然贴合这个状态，但不要直接说出 emotion/intensity 等系统字段。
```

## 4. 表情映射

### 4.1 表情 ID 映射表

8 款 Live2D 模型 × 10 种情绪的完整映射：

| 情绪 | Hiyori | Haru | Mao | Ren | Natori | Mark | Rice | Wanko |
|------|--------|------|-----|-----|--------|------|------|-------|
| neutral | Normal | F01 | exp_01 | exp_01 | Normal | Normal | Normal | Normal |
| happy | Smile | F02 | exp_02 | exp_02 | Smile | Smile | Smile | Smile |
| shy | Blushing | F03 | exp_03 | exp_03 | Blushing | Blushing | Blushing | Blushing |
| sad | Sad | F04 | exp_04 | exp_04 | Sad | Sad | Sad | Sad |
| worried | Sad | F04 | exp_04 | exp_04 | Sad | Sad | Sad | Sad |
| wronged | Wronged | F05 | exp_05 | exp_05 | Sad | Wronged | Wronged | Wronged |
| angry | Angry | F06 | exp_06 | exp_04 | Angry | Angry | Angry | Angry |
| comforting | Smile | F02 | exp_02 | exp_02 | Smile | Smile | Smile | Smile |
| playful | Blushing | F07 | exp_07 | exp_03 | Blushing | Blushing | Blushing | Blushing |
| sleepy | Sad | F04 | exp_04 | exp_04 | Sad | Sad | Sad | Sad |

### 4.2 动画索引映射

情绪先映射到动画类别（happy/serious/sad），再按模型选择具体动画索引：

| 情绪 | 动画类别 | Hiyori | Haru | Mark | Natori | Rice | Mao | Wanko | Ren |
|------|---------|--------|------|------|--------|------|-----|-------|-----|
| neutral/happy/shy/playful/comforting | happy | 1 | 1 | 3 | 5 | 2 | 4 | 1 | 1 |
| angry | serious | 3 | 2 | 4 | 6 | 3 | 3 | 3 | 0 |
| sad/worried/wronged/sleepy | sad | 7 | 1 | 3 | 5 | 1 | 2 | 2 | 0 |

### 4.3 淡入淡出

所有 43 个 `.exp3.json` 表情文件均配置：
```json
{
  "FadeInTime": 0.5,
  "FadeOutTime": 0.5
}
```
确保表情切换有 0.5 秒的平滑过渡。

## 5. WebSocket 协议

### 5.1 `assistant.meta` 消息

后端在发送 AI 回复前，先发送情绪元数据：

```json
{
  "type": "assistant.meta",
  "data": {
    "reply_id": "reply_xxx",
    "animation_index": 1,
    "emotion": "happy",
    "emotion_label": "开心",
    "emotion_intensity": 0.68,
    "emotion_reason": "用户表达开心、感谢或积极反馈",
    "expression": "Smile",
    "should_take_photo": false,
    "prompt": "哈哈哈太好玩了"
  }
}
```

### 5.2 旧格式消息 (type=1)

`send_personal_message` 发送的消息也携带情绪字段：

```json
{
  "type": 1,
  "data": {
    "message": "小凡: 哈哈，看到你这么开心我也好高兴！",
    "audio_url": "",
    "animation_index": 1,
    "emotion": "happy",
    "emotion_label": "开心",
    "emotion_intensity": 0.68,
    "expression": "Smile"
  }
}
```

### 5.3 前端事件派发

`websocketmanager.ts` 解析上述两种消息格式后，派发自定义事件：

- **`companion-emotion`**：携带 `{ emotion, emotionLabel, intensity, reason, expression }`
- **`change-animation`**：携带 `{ animationIndex }`

## 6. 三通道接入

### 6.1 文字聊天 (`handle_text_message`)

1. 调用 `analyze_companion_emotion(text, current_state)` 分析情绪
2. `manager.set_emotion_state(session_id, emotion_state)` 存储状态
3. 非 neutral 且强度 ≥ 0.3 时，`timeline_service.record_emotion()` 写入时间线
4. `build_emotion_prompt_context(emotion_state)` 注入情绪到系统提示词
5. 发送 `assistant.meta`（含情绪字段）
6. 流式发送 `assistant.start → assistant.delta → assistant.complete`

### 6.2 图片聊天 (`handle_image_message`)

1. 用用户 prompt 或默认"拍照"作为情绪输入
2. 调用 `analyze_companion_emotion` 分析情绪
3. 存储情绪状态
4. 发送 `assistant.meta`（含情绪字段）
5. 调用 `image_processor.process_image_message` 获取 GLM-4V 分析结果
6. 通过 `send_personal_message` 发送回复（携带情绪字段）

### 6.3 抖音直播 (`handle_comment_message`)

**互动动作**（进房/关注/点赞/礼物）：
- 按动作类型映射情绪：member→happy, social→happy, like→happy, gift→shy
- 调用 `analyze_companion_emotion` 分析回复文案
- 存储到 `"livestream_session"` 专属 key（与普通聊天隔离）
- 通过 `send_livestream_assistant_message` 发送

**评论回复**：
- 调用 `analyze_companion_emotion(content, current_state)` 分析评论内容
- `build_emotion_prompt_context` 注入情绪到评论处理 prompt
- 通过 `send_livestream_assistant_message` 发送回复

### 6.4 直播情绪隔离

- 直播使用固定 key `"livestream_session"`，与普通聊天的 `identity.session_id` 完全隔离
- 直播停止时（`POST /api/livestream/douyin/stop`）自动调用 `manager.reset_emotion_state("livestream_session")` 清除情绪
- 避免直播情绪残留影响下次直播或泄漏到普通聊天

## 7. 持久化

### 7.1 `emotion_states` 表

```sql
CREATE TABLE emotion_states (
  session_id TEXT PRIMARY KEY,
  emotion TEXT NOT NULL DEFAULT 'neutral',
  emotion_label TEXT NOT NULL DEFAULT '平静',
  intensity REAL NOT NULL DEFAULT 0.0,
  reason TEXT NOT NULL DEFAULT '默认平静状态',
  decay_turns INTEGER NOT NULL DEFAULT 0,
  updated_at REAL NOT NULL
);
```

- 后端重启后情绪状态可恢复
- 直播使用 `"livestream_session"` 作为 session_id

### 7.2 `timeline_events` 表中的情绪事件

```sql
INSERT INTO timeline_events (
  id, user_id, companion_id, session_id, event_type, title, content,
  emotional_valence, importance, source_memory_id, source_type,
  occurred_at, detected_at, created_at
) VALUES (...)
-- event_type = 'emotion'
-- source_type = 'emotion_state'
```

- 仅非 neutral 且强度 ≥ 0.3 的情绪才记录
- 可通过 `GET /api/debug/emotion/{session_id}/history` 查询

## 8. 调试

### 8.1 Debug 面板

在 URL 中添加 `?debugEmotion=true` 参数即可显示情绪调试面板。

功能：
- 选择情绪类型（10 种）
- 调整强度（0-1，步进 0.05）
- 应用/重置按钮
- 显示当前表情 ID 和动画索引
- **情绪历史曲线图**：SVG 折线图，展示最近 20 条情绪变化，每 5 秒自动刷新

### 8.2 Debug API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/debug/emotion` | 手动设置会话情绪状态 |
| GET | `/api/debug/emotion/{session_id}` | 查询当前情绪状态 |
| GET | `/api/debug/emotion/{session_id}/history` | 查询情绪变化历史 |

**POST 请求体**：
```json
{
  "session_id": "debug-test",
  "emotion": "happy",
  "intensity": 0.8,
  "reason": "测试",
  "model_name": "Hiyori"
}
```

## 9. 前端实现细节

### 9.1 防抖机制 (`DigitalHumanStage.tsx`)

- 收到 `companion-emotion` 事件后，延迟 **500ms** 执行表情切换
- 如果在 500ms 内收到新事件，清除上一个定时器重新计时
- **跳过条件**：情绪相同且强度差 < 0.1

### 9.2 可视化展示

- **Emoji 图标**：每种情绪对应一个 emoji（😊🥰😢😰😤😴 等）
- **强度进度条**：40px 宽，按情绪类型着色
  - happy/playful: `#ff7ab6`（粉色）
  - shy: `#ff9ac9`（浅粉）
  - worried/comforting: `#7aa7ff`（蓝色）
  - sad/wronged: `#8c9bb8`（灰蓝）
  - angry: `#ff6b6b`（红色）
  - sleepy: `#9b8cff`（紫色）
- 强度 < 0.05 时不显示进度条

### 9.3 多页面事件监听

以下页面均监听 `companion-emotion` 和 `change-animation` 事件：
- `DigitalHumanStage.tsx`（主舞台）
- `MobilePage.tsx`（移动端）
- `LiveStreamPage.tsx`（直播页）

## 10. 测试

### 10.1 后端测试 (`tests/test_emotion.py`)

5 项单元测试，覆盖：
- `test_worry_keywords`：疲惫/压力关键词 → worried
- `test_shy_keywords`：亲密关键词 → shy
- `test_state_decay`：上一轮 worried(0.8) → 0.68 衰减
- `test_recovery_keyword_overrides_previous_state`：恢复关键词覆盖旧状态
- `test_neutral_state_decays_to_neutral`：低强度自动回 neutral

运行：`docker compose exec -T backend python -m unittest discover -s tests -p 'test_*.py'`

### 10.2 前端测试 (`src/__tests__/emotion.test.ts`)

32 项 vitest 测试，覆盖：
- `normalizeCompanionEmotion`：有效/无效/边界值输入
- `EMOTION_LABEL_MAP`：标签完整性、唯一性、语义正确性
- `getExpressionForEmotion`：8 款模型 × 10 种情绪映射、回退逻辑、大小写敏感
- `EXPRESSION_MAP`：结构完整性、模型数量、情绪数量

运行：`cd FrontendProject/TypeScript/AI && npx vitest run`
