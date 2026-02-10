# 更新日志 (Changelog)

本文档记录了项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- **Docker**: 添加 Docker Compose 一键部署配置
- **Docker**: 添加前端 Dockerfile 支持多阶段构建
- **Docker**: 添加后端 Dockerfile 支持 Python 3.13
- **Docker**: 添加 Nginx 反向代理配置
- **Docker**: 优化前端资源复制脚本支持容器环境检测
- **Docker**: 添加各项目 Docker 忽略文件配置
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

### 其他
- **配置**: 修改后端服务地址为本地环境
- **配置**: 更新 .env.example 配置文件
- **文档**: 删除项目多余的通知文档文件

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
