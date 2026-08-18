# 记忆系统数据库与接口草案

## 1. 文档目的

本文是 `MEMORY_SYSTEM_DESIGN.md` 的配套草案，聚焦两个问题：

1. Phase 1 需要哪些核心表结构；
2. Phase 1 前后端需要哪些最小接口与字段。

本文优先满足“可以直接开发”的目标，因此字段命名、状态枚举和接口形状会尽量具体。

## 2. 版本约定

### 2.1 当前建议版本

- 文档版本：`draft-v1`
- 目标阶段：`Phase 1`

### 2.2 兼容策略

当前项目仍存在较多基于 `client_id` 的逻辑，因此 Phase 1 采用“新增字段，兼容旧字段”的方式：

- 新接口优先使用 `user_id/session_id/companion_id`
- 旧逻辑保留 `client_id`
- 后端内部逐步将 `client_id` 退化为连接级标识

## 3. 核心枚举

### 3.1 `memory_type`

| 值 | 说明 |
| --- | --- |
| `fact` | 用户或角色的稳定事实 |
| `preference` | 用户偏好 |
| `pinned` | 用户手动置顶记忆 |
| `summary` | 会话摘要 |
| `boundary` | 称呼、表达边界、不喜欢的话题 |

### 3.2 `memory_status`

| 值 | 说明 |
| --- | --- |
| `active` | 当前有效 |
| `superseded` | 被新记忆覆盖 |
| `deleted` | 用户删除，不再召回 |
| `archived` | 归档保留，不默认召回 |
| `pending_confirm` | 待用户确认 |

### 3.3 `memory_source_type`

| 值 | 说明 |
| --- | --- |
| `chat` | 来自文字对话 |
| `image` | 来自图片分析 |
| `audio` | 来自语音转文本 |
| `manual` | 用户手动创建 |
| `system` | 系统自动生成 |

### 3.4 `session_mode`

| 值 | 说明 |
| --- | --- |
| `chat` | 普通聊天 |
| `advanced` | 高级模式 |
| `mobile` | 移动端聊天 |
| `livestream_console` | 直播控制台 |
| `livestream_stage` | 直播展示端 |

## 4. 数据库草案

## 4.1 `users`

### 4.1.1 说明

用于表示长期稳定的用户身份。

### 4.1.2 建表草案

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 4.1.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | text(uuid) | 是 | 用户主键 |
| `display_name` | text | 否 | 展示名，可空 |
| `created_at` | text(timestamp) | 是 | 创建时间 |
| `updated_at` | text(timestamp) | 是 | 更新时间 |

## 4.2 `companions`

### 4.2.1 说明

表示虚拟人物实例。Phase 1 如果暂时只有一个默认角色，也建议保留此表，为后续多角色做准备。

### 4.2.2 建表草案

```sql
CREATE TABLE IF NOT EXISTS companions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_personality TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 4.3 `conversation_sessions`

### 4.3.1 说明

表示一次会话，用于承载会话摘要和上下文恢复。

### 4.3.2 建表草案

```sql
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  companion_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  latest_summary TEXT,
  metadata_json TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_id) REFERENCES companions(id)
);
```

### 4.3.3 索引建议

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user_companion
ON conversation_sessions(user_id, companion_id, updated_at DESC);
```

## 4.4 `memory_items`

### 4.4.1 说明

Phase 1 的核心表，保存长期记忆。

### 4.4.2 建表草案

```sql
CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  companion_id TEXT NOT NULL,
  session_id TEXT,
  memory_type TEXT NOT NULL,
  status TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'user',
  title TEXT,
  content TEXT NOT NULL,
  normalized_json TEXT,
  importance INTEGER NOT NULL DEFAULT 3,
  confidence REAL NOT NULL DEFAULT 0.8,
  recall_count INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  ttl_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (companion_id) REFERENCES companions(id),
  FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
);
```

### 4.4.3 索引建议

```sql
CREATE INDEX IF NOT EXISTS idx_memory_active
ON memory_items(user_id, companion_id, status, memory_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_source
ON memory_items(source_type, source_ref);
```

### 4.4.4 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | text(uuid) | 是 | 记忆主键 |
| `user_id` | text | 是 | 所属用户 |
| `companion_id` | text | 是 | 所属角色 |
| `session_id` | text | 否 | 来源会话 |
| `memory_type` | text | 是 | 记忆类型 |
| `status` | text | 是 | 当前状态 |
| `scope` | text | 是 | `user/shared/companion` |
| `title` | text | 否 | 简短标题 |
| `content` | text | 是 | 记忆正文 |
| `normalized_json` | text(json) | 否 | 结构化内容 |
| `importance` | integer | 是 | 1-5 |
| `confidence` | real | 是 | 0-1 |
| `recall_count` | integer | 是 | 被召回次数 |
| `source_type` | text | 是 | 来源类型 |
| `source_ref` | text | 否 | 来源消息标识 |
| `ttl_at` | text | 否 | 过期时间 |
| `created_at` | text | 是 | 创建时间 |
| `updated_at` | text | 是 | 更新时间 |
| `deleted_at` | text | 否 | 逻辑删除时间 |

## 4.5 `memory_operation_logs`

### 4.5.1 说明

Phase 1 可选。如果希望便于排查“为什么记错/为什么删了”，建议增加操作日志表。

### 4.5.2 建表草案

```sql
CREATE TABLE IF NOT EXISTS memory_operation_logs (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  operator_type TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (memory_id) REFERENCES memory_items(id)
);
```

## 5. 后端内部对象草案

## 5.1 `ResolvedIdentity`

```json
{
  "connection_id": "conn_xxx",
  "client_id": "legacy_client_xxx",
  "user_id": "user_xxx",
  "session_id": "session_xxx",
  "companion_id": "companion_default",
  "mode": "chat"
}
```

## 5.2 `MemoryItem`

```json
{
  "id": "mem_xxx",
  "user_id": "user_xxx",
  "companion_id": "companion_default",
  "session_id": "session_xxx",
  "memory_type": "preference",
  "status": "active",
  "scope": "user",
  "title": "饮品偏好",
  "content": "用户喜欢乌龙奶茶",
  "normalized_json": {
    "category": "drink",
    "value": "乌龙奶茶"
  },
  "importance": 3,
  "confidence": 0.92,
  "recall_count": 0,
  "source_type": "chat",
  "source_ref": "msg_xxx",
  "ttl_at": null,
  "created_at": "2026-08-18T10:00:00Z",
  "updated_at": "2026-08-18T10:00:00Z"
}
```

## 6. HTTP 接口草案

Phase 1 推荐将“记忆管理”优先做成 HTTP 接口，避免把过多 CRUD 细节压进现有聊天 WebSocket 主链。

## 6.1 `GET /api/memories`

### 6.1.1 说明

查询当前用户在当前角色下的记忆列表。

### 6.1.2 Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | string | 是 | 用户 ID |
| `companion_id` | string | 是 | 角色 ID |
| `memory_type` | string | 否 | 指定类型 |
| `status` | string | 否 | 默认 `active` |
| `limit` | int | 否 | 默认 20 |
| `offset` | int | 否 | 默认 0 |

### 6.1.3 响应草案

```json
{
  "items": [
    {
      "id": "mem_1",
      "memory_type": "pinned",
      "content": "以后叫我阿雨",
      "importance": 5,
      "updated_at": "2026-08-18T10:00:00Z"
    }
  ],
  "total": 1
}
```

## 6.2 `POST /api/memories`

### 6.2.1 说明

创建一条手动记忆，Phase 1 主要用于新增 `pinned`。

### 6.2.2 请求体草案

```json
{
  "user_id": "user_xxx",
  "companion_id": "companion_default",
  "memory_type": "pinned",
  "content": "以后叫我阿雨",
  "title": "称呼偏好",
  "importance": 5
}
```

### 6.2.3 响应草案

```json
{
  "id": "mem_xxx",
  "status": "active"
}
```

## 6.3 `PATCH /api/memories/{memory_id}`

### 6.3.1 说明

更新一条记忆，Phase 1 主要用于编辑手动记忆。

### 6.3.2 请求体草案

```json
{
  "content": "以后叫我阿雨，不要叫宝宝",
  "importance": 5
}
```

## 6.4 `DELETE /api/memories/{memory_id}`

### 6.4.1 说明

逻辑删除记忆，将 `status` 置为 `deleted`，并记录 `deleted_at`。

### 6.4.2 响应草案

```json
{
  "id": "mem_xxx",
  "status": "deleted"
}
```

## 6.5 `GET /api/sessions/{session_id}`

### 6.5.1 说明

读取会话摘要信息。

### 6.5.2 响应草案

```json
{
  "id": "session_xxx",
  "latest_summary": "用户今天聊了工作压力，并提到喜欢乌龙奶茶。",
  "updated_at": "2026-08-18T10:00:00Z"
}
```

## 7. WebSocket 入站草案

## 7.1 文本消息

在现有结构上扩展：

```json
{
  "type": "text",
  "data": {
    "content": "今天好累",
    "client_id": "legacy_client_xxx",
    "user_id": "user_xxx",
    "session_id": "session_xxx",
    "companion_id": "companion_default",
    "mode": "chat",
    "model": "Hiyori",
    "is_audio": true,
    "timestamp": "2026-08-18T10:00:00Z"
  }
}
```

## 7.2 图片消息

```json
{
  "type": "image",
  "data": {
    "image": "base64_xxx",
    "format": "jpeg",
    "client_id": "legacy_client_xxx",
    "user_id": "user_xxx",
    "session_id": "session_xxx",
    "companion_id": "companion_default",
    "mode": "advanced",
    "prompt": "看看我今天气色",
    "timestamp": "2026-08-18T10:00:00Z"
  }
}
```

## 7.3 控制消息

保留现有 `control`，Phase 1 只建议增加最少管理能力，供后端内测或兼容调用：

```json
{
  "type": "control",
  "data": {
    "action": "memory.list",
    "user_id": "user_xxx",
    "session_id": "session_xxx",
    "companion_id": "companion_default",
    "timestamp": "2026-08-18T10:00:00Z"
  }
}
```

说明：

- 对用户可见的正式记忆管理仍推荐走 HTTP；
- WebSocket 中保留调试和兼容能力即可。

## 8. WebSocket 出站草案

## 8.1 继续保留现有流式事件

Phase 1 不建议改动：

- `assistant.start`
- `assistant.meta`
- `assistant.delta`
- `assistant.audio_segment`
- `assistant.complete`
- `assistant.error`

## 8.2 新增可选记忆事件

### 8.2.1 `memory.updated`

```json
{
  "type": "memory.updated",
  "data": {
    "memory_id": "mem_xxx",
    "memory_type": "pinned",
    "status": "active",
    "source_type": "manual"
  }
}
```

用途：

- 手动新增或编辑后，前端可局部刷新。

### 8.2.2 `memory.deleted`

```json
{
  "type": "memory.deleted",
  "data": {
    "memory_id": "mem_xxx",
    "status": "deleted"
  }
}
```

## 9. 记忆抽取输出接口草案

建议 `memory_extractor` 返回统一结构：

```json
{
  "facts": [
    {
      "memory_type": "fact",
      "title": "用户职业",
      "content": "用户是初中数学老师",
      "normalized_json": {
        "category": "job",
        "value": "初中数学老师"
      },
      "importance": 4,
      "confidence": 0.93
    }
  ],
  "preferences": [
    {
      "memory_type": "preference",
      "title": "饮品偏好",
      "content": "用户喜欢乌龙奶茶",
      "normalized_json": {
        "category": "drink",
        "value": "乌龙奶茶"
      },
      "importance": 3,
      "confidence": 0.9
    }
  ],
  "boundaries": [
    {
      "memory_type": "boundary",
      "title": "称呼偏好",
      "content": "用户不喜欢被叫宝宝，更喜欢阿雨",
      "importance": 5,
      "confidence": 0.95
    }
  ],
  "session_summary": {
    "memory_type": "summary",
    "content": "本轮主要聊了工作压力与饮品偏好。",
    "importance": 2,
    "confidence": 0.88
  }
}
```

## 10. 记忆检索输出草案

`memory_retriever` 输出给 `prompt_builder` 的结构建议如下：

```json
{
  "pinned_memories": [
    {
      "id": "mem_pin_1",
      "content": "以后叫我阿雨"
    }
  ],
  "facts": [
    {
      "id": "mem_fact_1",
      "content": "用户喜欢乌龙奶茶"
    }
  ],
  "session_summary": {
    "id": "mem_sum_1",
    "content": "最近聊过工作压力和考试焦虑。"
  }
}
```

## 11. Prompt 上下文草案

传给 `prompt_builder` 的最终记忆上下文建议为：

```text
[用户置顶记忆]
- 以后叫用户“阿雨”。

[已知用户偏好]
- 用户喜欢乌龙奶茶。

[最近会话摘要]
- 最近聊过工作压力，用户今天状态偏疲惫。
```

同时给模型约束：

- 仅在合适时自然使用这些信息；
- 不要逐条复述；
- 如与用户当前输入冲突，以当前输入为准。

## 12. 前端类型草案

## 12.1 `UserIdentity`

```ts
export interface UserIdentity {
  userId: string;
  sessionId: string;
}
```

## 12.2 `MemoryItem`

```ts
export interface MemoryItem {
  id: string;
  memoryType: 'fact' | 'preference' | 'pinned' | 'summary' | 'boundary';
  content: string;
  title?: string;
  importance: number;
  updatedAt: string;
}
```

## 12.3 `MemoryListResponse`

```ts
export interface MemoryListResponse {
  items: MemoryItem[];
  total: number;
}
```

## 13. 错误码草案

## 13.1 HTTP 错误码

| 错误码 | 说明 |
| --- | --- |
| `MEMORY_NOT_FOUND` | 记忆不存在 |
| `MEMORY_INVALID_TYPE` | 记忆类型不支持 |
| `MEMORY_FORBIDDEN` | 无权访问该记忆 |
| `MEMORY_BAD_REQUEST` | 参数错误 |
| `SESSION_NOT_FOUND` | 会话不存在 |

## 13.2 WebSocket 错误消息

推荐形状：

```json
{
  "type": "error",
  "data": {
    "code": "MEMORY_BAD_REQUEST",
    "message": "memory_type 不合法"
  }
}
```

## 14. Phase 1 实现建议

如果按最小闭环推进，建议严格先做：

1. `users`
2. `conversation_sessions`
3. `memory_items`
4. `GET/POST/PATCH/DELETE /api/memories`
5. 文本消息携带 `user_id/session_id`
6. 回复前查询 `pinned + fact + summary`
7. 回复后写 `summary + fact/preference`

这样做可以最快形成可见价值，同时不会把直播、图片、向量检索等复杂度一起拉进首轮开发。
