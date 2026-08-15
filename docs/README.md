# 小凡 AI 项目文档

> 文档基线：`develop` 分支，代码提交 `798335b`；梳理日期：2026-08-14。

本文档集以当前仓库代码为准，用于开发交接、接口联调和部署运维。项目根目录的 `README.md` 偏产品介绍；本目录聚焦工程实现。

| 文档 | 内容 | 主要读者 |
| --- | --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统上下文、容器、模块边界、核心链路、数据与外部依赖 | 架构师、技术负责人、新成员 |
| [DESIGN.md](./DESIGN.md) | 前后端内部设计、关键类、状态管理、异常处理、技术债与演进建议 | 开发、测试 |
| [FRONTEND_REDESIGN.md](./FRONTEND_REDESIGN.md) | AI 女友三模式的产品交互、页面布局、前端架构和重构路线 | 产品、设计、前端开发 |
| [PROTOCOL.md](./PROTOCOL.md) | HTTP/WebSocket、消息字段、时序、弹幕转发、外部服务协议 | 前后端开发、联调人员 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 本地开发、构建、Docker Compose、Nginx、环境变量、验收与排障 | 运维、开发 |
| [CHANGELOG_2026-08-14_2026-08-15.md](./CHANGELOG_2026-08-14_2026-08-15.md) | 2026-08-14 至 2026-08-15 的工程梳理、前端重构、流式文字和流式 TTS 修改记录 | 项目负责人、开发、测试 |

## 当前工程结论

- 主应用由 React/TypeScript/Vite、Live2D Cubism、FastAPI 和若干 AI/TTS/ASR 外部服务组成。
- 主要业务通信使用单条 WebSocket：`/ws/{client_id}`。
- 抖音直播链路由独立的 `dycast` Vue 应用采集弹幕，再通过 WebSocket 把 JSON 数组转发给 FastAPI。
- 后端会话、连接、音频缓冲均保存在单进程内存中；当前不适合直接水平扩容。
- 源码可通过 TypeScript 类型检查、Vite 构建和 Python 语法编译；Docker 镜像未实测，因为梳理时本机 Docker daemon 未运行。
- 当前 Compose/Nginx/前端地址配置存在若干部署阻塞项，已在部署文档的“已知问题”章节列出。
