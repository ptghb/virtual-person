# 记忆系统 Phase 1 实施清单

## 1. 目标

Phase 1 的目标不是一次性做完整记忆系统，而是先把“长期身份 + 基础长期记忆 + 检索接入 + 用户可控入口”跑通。

本阶段完成后，系统应具备：

- 同一用户跨页面刷新后仍可延续长期记忆；
- 支持自动提取和召回基础事实记忆；
- 支持手动新增、编辑、删除置顶记忆；
- 在不明显破坏当前流式回复体验的前提下，把记忆接入文字对话主链；
- 为 Phase 2 的事件记忆和关系状态预留清晰扩展位。

## 2. 范围

### 2.1 本阶段包含

- 稳定 `user_id` 和 `session_id`；
- 引入基础数据库和 repository；
- 落地 `fact / preference / pinned / summary` 四类记忆；
- 接入“回复前检索”和“回复后抽取”；
- 提供最小可用的记忆管理接口；
- 在设置页增加置顶记忆管理入口。

### 2.2 本阶段不包含

- 事件记忆和关系状态自动更新；
- 视觉记忆长期固化；
- 向量检索；
- Mind Map 可视化；
- 多角色共享记忆；
- 复杂记忆反馈学习。

## 3. 交付物

本阶段建议交付以下内容：

1. 后端基础模块
   - `domain/memory_service.py`
   - `domain/memory_extractor.py`
   - `domain/memory_retriever.py`
   - `domain/prompt_builder.py`
   - `repositories/*.py`
   - `schemas/memory.py`
   - `infrastructure/db.py`

2. 数据库迁移
   - `users`
   - `conversation_sessions`
   - `memory_items`

3. 协议扩展
   - 入站消息支持 `user_id/session_id/companion_id`
   - 控制消息支持最小记忆管理操作

4. 前端功能
   - 本地持久化 `user_id`
   - 建立会话时生成/维护 `session_id`
   - 设置页增加“置顶记忆”管理

5. 文档
   - 协议草案
   - 库表草案
   - 开发说明

## 4. 技术路线

### 4.1 存储

建议 Phase 1 先用 SQLite 跑通本地闭环，并通过 repository 抽象避免后续迁移成本。

理由：

- 当前项目仍以单机开发为主；
- Phase 1 更重要的是流程打通；
- SQLite 足以支撑基础事实记忆；
- 后续切 PostgreSQL 时只替换底层实现。

### 4.2 检索

Phase 1 只做结构化检索 + 简单关键词匹配，不上 embedding。

召回来源：

- `pinned`
- `fact`
- `preference`
- `summary`

重排依据：

- 是否置顶；
- 是否最近更新；
- 是否被关键词命中；
- 重要性分值。

### 4.3 抽取

Phase 1 采用轻量 LLM 抽取，但只抽结构简单、误判成本相对较低的内容：

- 用户身份信息；
- 称呼偏好；
- 稳定偏好；
- 不喜欢的表达方式；
- 本轮会话摘要。

## 5. 实施分解

## 5.1 第 0 步：冻结接口命名

目标：

- 明确 Phase 1 使用的字段名和消息类型；
- 避免开发中前后端各起一套名字。

任务：

- 统一新增字段：`user_id`、`session_id`、`companion_id`；
- 保留现有 `client_id` 兼容；
- 明确控制消息动作名：
  - `memory.list`
  - `memory.create`
  - `memory.update`
  - `memory.delete`

验收：

- 文档中存在唯一命名；
- 前后端都按同一命名实现。

## 5.2 第 1 步：落地稳定身份

目标：

- 建立“长期用户”和“单次会话”的区别。

前端任务：

1. 新增 `user-identity.service.ts`
   - 读取/生成 `user_id`
   - 读取/生成 `session_id`
   - 暴露 `getUserIdentity()`

2. 在 `useConversationSession` 中接入
   - 建立连接时带上 `user_id/session_id`
   - 页面刷新后保持同一 `user_id`
   - 会话清空时可创建新 `session_id`

后端任务：

1. 新增身份解析函数
   - 从 `msg_data` 中优先读取 `user_id/session_id`
   - 若无则回退到现有 `client_id`

2. 调整 `ConnectionManager`
   - 继续维护连接映射
   - 但内部逐步减少对 `client_id` 作为长期上下文主键的依赖

验收：

- 用户刷新页面后 `user_id` 不变；
- 新会话可显式生成新的 `session_id`；
- 不传新字段时老流程仍可运行。

## 5.3 第 2 步：引入数据库和 repository

目标：

- 将长期记忆从进程内存迁移到持久化存储。

任务：

1. 新增 `infrastructure/db.py`
   - 初始化 SQLite 连接
   - 提供事务和基础执行方法

2. 新增 repository
   - `user_repository.py`
   - `session_repository.py`
   - `memory_repository.py`

3. 新增初始化脚本
   - 启动时自动建表或执行迁移

4. 明确数据库文件位置
   - 建议 `BackendProject/data/app.db`

验收：

- 服务启动后自动创建数据库；
- 能插入和读取用户、会话、记忆记录；
- 不影响现有 WebSocket 服务启动。

## 5.4 第 3 步：实现基础 schema

目标：

- 统一后端内部的记忆对象结构。

任务：

1. 新增 `schemas/memory.py`
   - `MemoryType`
   - `MemoryStatus`
   - `MemoryItem`
   - `MemoryCreateInput`
   - `MemoryQuery`

2. 新增 `schemas/session.py`
   - `ConversationSession`
   - `ResolvedIdentity`

3. 统一 `importance/confidence/status` 的取值约束

验收：

- 代码中不再到处传裸字典；
- repository 和 service 使用统一 schema。

## 5.5 第 4 步：实现基础记忆服务

目标：

- 提供记忆的增删改查能力。

任务：

1. 新增 `domain/memory_service.py`
   - `create_memory`
   - `update_memory`
   - `delete_memory`
   - `list_memories`
   - `upsert_pinned_memory`

2. 加入最小规则
   - 置顶记忆默认长期有效
   - 自动记忆不能覆盖人工置顶
   - 删除后不再召回

验收：

- 通过 service 可完成完整 CRUD；
- `pinned` 记忆优先级最高。

## 5.6 第 5 步：实现会话摘要

目标：

- 降低对完整历史消息的依赖。

任务：

1. 新增 `conversation_sessions.latest_summary`
2. 在每轮对话后更新会话摘要
3. 规则：
   - Phase 1 仅保留最近一份摘要
   - 摘要关注：话题、偏好、情绪、未完话题

实现建议：

- 先使用 LLM 生成；
- 若失败则回退为空，不阻塞主链。

验收：

- 每个 `session_id` 至少可读取到一条最近摘要；
- 新摘要可覆盖旧摘要。

## 5.7 第 6 步：实现基础记忆抽取

目标：

- 将当前轮问答转为候选长期记忆。

Phase 1 抽取范围：

- `fact`
- `preference`
- `boundary`
- `summary`

任务：

1. 新增 `domain/memory_extractor.py`
2. 输入：
   - 用户消息
   - AI 回复
   - 角色设定
3. 输出：
   - 标准 JSON
4. 加入最小去重策略

建议 Prompt：

- 只提取稳定、可持续的信息；
- 不要提取一时性的情绪描述为长期事实；
- 不确定时不要输出。

验收：

- 能从测试对话中抽出偏好和称呼；
- 不会把明显临时内容大量写入长期记忆。

## 5.8 第 7 步：实现基础记忆检索

目标：

- 在回复前提供少量高价值记忆上下文。

任务：

1. 新增 `domain/memory_retriever.py`
2. 检索顺序：
   - `pinned`
   - 关键词命中的 `fact/preference`
   - 最近会话摘要
3. 控制配额：
   - `pinned` 最多 5 条
   - `fact/preference` 最多 5 条
   - `summary` 最多 1 条

验收：

- 输入“你还记得我喜欢喝什么吗”能召回饮品偏好；
- 输入不相关时不会塞入过多记忆。

## 5.9 第 8 步：改造 Prompt Builder

目标：

- 从 `handle_text_message` 中抽离 Prompt 拼装逻辑。

任务：

1. 新增 `domain/prompt_builder.py`
2. 组装顺序：
   - 基础系统提示词
   - 角色配置
   - 置顶记忆
   - 相关事实记忆
   - 会话摘要
   - 当前输入

3. 增加自然使用约束：
   - 不要机械列出记忆
   - 只在相关时自然提及

验收：

- `handle_text_message` 不再直接拼整段系统提示词；
- 记忆上下文可控且可单测。

## 5.10 第 9 步：接入文本主链

目标：

- 让记忆系统真正影响回复。

接入点：

1. 回复前
   - 解析身份
   - 查询会话摘要
   - 查询记忆
   - 调用 Prompt Builder

2. 回复后
   - 写原始消息历史
   - 异步更新会话摘要
   - 异步抽取长期记忆

注意：

- 抽取与写入不得阻塞流式输出；
- 主回复失败时不做记忆写入；
- 记忆服务失败时应降级，不影响主聊天。

验收：

- 现有流式输出还可正常工作；
- 回复内容会自然参考置顶记忆和基础偏好。

## 5.11 第 10 步：新增记忆管理接口

目标：

- 提供给前端最小可用的记忆管理能力。

建议先通过 WebSocket 控制消息完成：

- `memory.list`
- `memory.create`
- `memory.update`
- `memory.delete`

可选补充 HTTP：

- `GET /api/memories`
- `POST /api/memories`
- `PATCH /api/memories/{id}`
- `DELETE /api/memories/{id}`

Phase 1 推荐：

- 后端内部先实现 service；
- 对外优先走 HTTP，避免把 CRUD 细节挤进现有聊天 WebSocket 主链。

验收：

- 前端可读取置顶记忆列表；
- 可新增、编辑、删除置顶记忆。

## 5.12 第 11 步：设置页接入“置顶记忆”

目标：

- 让用户可见、可控。

前端任务：

1. 在 `SettingsPage` 增加区域：
   - 置顶记忆列表
   - 新增记忆输入框
   - 编辑 / 删除按钮

2. 新增 `memory.service.ts`
   - 调用记忆接口

3. 交互规则：
   - 新增成功后即时刷新
   - 删除需二次确认

验收：

- 用户可以在设置页维护 1 到多条置顶记忆；
- 更新后下一轮聊天即可生效。

## 6. 文件级修改建议

### 6.1 后端新增文件

```text
BackendProject/
├── domain/
│   ├── memory_service.py
│   ├── memory_extractor.py
│   ├── memory_retriever.py
│   └── prompt_builder.py
├── repositories/
│   ├── user_repository.py
│   ├── session_repository.py
│   └── memory_repository.py
├── schemas/
│   ├── memory.py
│   └── session.py
└── infrastructure/
    └── db.py
```

### 6.2 后端修改文件

- `BackendProject/main.py`
  - 接入身份解析
  - 接入记忆检索
  - 接入异步记忆抽取
  - 增加记忆管理接口

- `BackendProject/services/llm_service.py`
  - 可选补充专用于记忆抽取/摘要的接口封装

### 6.3 前端新增文件

```text
FrontendProject/TypeScript/AI/src/services/
├── user-identity.service.ts
├── memory.service.ts
└── memory.types.ts
```

### 6.4 前端修改文件

- `src/hooks/useConversationSession.ts`
  - 发送 `user_id/session_id`

- `src/websocketmanager.ts`
  - 支持新字段透传

- `src/pages/SettingsPage.tsx`
  - 增加置顶记忆管理

## 7. 开发顺序建议

推荐按下面顺序开发，减少回滚成本：

1. 身份持久化
2. 数据库与 repository
3. schema 与 service
4. 会话摘要
5. 基础记忆抽取
6. 基础记忆检索
7. Prompt Builder
8. 接入文本主链
9. 记忆管理接口
10. 设置页 UI

## 8. 测试清单

### 8.1 单元测试

- `user_id/session_id` 生成与持久化
- `memory_repository` CRUD
- 置顶记忆优先级
- 删除后不召回
- 摘要覆盖逻辑

### 8.2 集成测试

场景 1：

- 用户新增置顶记忆“我叫阿雨”
- 重新进入页面
- AI 能使用正确称呼

场景 2：

- 用户说“我喜欢乌龙奶茶”
- 下一轮或下次会话问“你记得我喜欢喝什么吗”
- 系统能答对

场景 3：

- 用户删除该偏好记忆
- 再次提问时不再强行引用旧信息

### 8.3 回归测试

- 普通文字聊天仍可流式返回
- 图片聊天不崩
- 语音转文字后仍可继续对话
- 直播逻辑不受影响

## 9. 风险控制

### 9.1 误抽取过多

控制方法：

- 只开放少数记忆类型；
- 抽取 Prompt 强调“宁缺毋滥”；
- 失败时可直接跳过。

### 9.2 主链性能回退

控制方法：

- 抽取异步化；
- 摘要失败不阻塞回复；
- 首版不上 embedding。

### 9.3 UI 复杂度扩张

控制方法：

- 第一版只做置顶记忆；
- 普通自动记忆先不做完整列表页。

## 10. 完成定义

Phase 1 完成的判断标准：

1. 已有稳定 `user_id`；
2. 已有持久化 `memory_items`；
3. 已有置顶记忆 CRUD；
4. 已在文本回复前接入记忆召回；
5. 已在文本回复后接入摘要和基础记忆抽取；
6. 设置页可管理置顶记忆；
7. 老聊天主链和流式输出仍可正常工作。
