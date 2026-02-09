# Docker Compose 一键部署指南

本文档介绍如何使用 Docker Compose 一键部署 CubismWebSamples 项目的前后端服务。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd CubismWebSamples
```

### 2. 配置环境变量

复制后端环境变量示例文件并填写必要的配置：

```bash
cp BackendProject/.env.example BackendProject/.env
```

编辑 `BackendProject/.env` 文件，填写以下必要配置：

```env
# OpenAI API 配置（如果使用 OpenAI）
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# SiliconFlow 语音识别API配置
SILICONFLOW_API_KEY=your_siliconflow_api_key

# 智谱AI GLM-4V API配置
ZHIPUAI_API_KEY=your_zhipuai_api_key

# 模型类型配置: zhipu 或 openai
MODEL_TYPE=zhipu

# TTS API URL（Docker 内部地址）
TTS_API_URL=http://tts:3000

# 是否启用音频
ISAUDIO=True
```

### 3. 配置 SSL 证书（可选但推荐）

如果需要启用 HTTPS，请准备 SSL 证书文件：

```bash
mkdir -p nginx/ssl
# 将证书文件复制到 nginx/ssl 目录
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

**注意**：如果没有 SSL 证书，可以：
1. 使用 Let's Encrypt 免费证书
2. 使用自签名证书（仅用于测试）
3. 修改 `nginx/nginx.conf`，移除 HTTPS 配置，仅使用 HTTP

### 4. 构建并启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 访问应用

- **HTTP**: http://localhost
- **HTTPS**: https://localhost（如果配置了 SSL 证书）

## 服务说明

Docker Compose 包含以下服务：

### 1. Nginx（反向代理）
- **端口**: 80 (HTTP), 443 (HTTPS)
- **功能**: 
  - 反向代理前端静态文件
  - WebSocket 代理到后端
  - API 请求代理
  - SSL/TLS 终止

### 2. Frontend（前端）
- **技术栈**: React + TypeScript + Vite
- **功能**: Live2D 虚拟人交互界面
- **端口**: 内部（通过 Nginx 暴露）

### 3. Backend（后端）
- **技术栈**: FastAPI + Python 3.11
- **端口**: 8000（内部）
- **功能**: 
  - WebSocket 通信
  - AI 对话处理
  - 图片识别
  - 语音识别

### 4. TTS（语音合成）
- **镜像**: coqui-ai/tts
- **端口**: 3000（内部）
- **功能**: 文本转语音服务
- **资源限制**: 2 CPU, 2GB 内存

## 常用命令

### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d backend

# 重新构建并启动
docker-compose up -d --build
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 停止特定服务
docker-compose stop backend
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近 100 行日志
docker-compose logs --tail=100 -f backend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入前端容器
docker-compose exec frontend sh

# 进入 TTS 容器
docker-compose exec tts bash
```

## 数据持久化

### 音频文件

音频文件存储在 `BackendProject/audio_files` 目录，通过 Docker 卷挂载持久化。

### 环境配置

环境变量配置在 `BackendProject/.env` 文件中，不会被容器删除影响。

## 故障排查

### 1. 服务无法启动

```bash
# 查看服务状态
docker-compose ps

# 查看详细日志
docker-compose logs <service-name>
```

### 2. 前端无法访问

- 检查 Nginx 是否正常运行：`docker-compose logs nginx`
- 检查前端构建是否成功：`docker-compose logs frontend`
- 确认端口未被占用：`lsof -i :80`

### 3. WebSocket 连接失败

- 检查后端服务状态：`docker-compose logs backend`
- 确认 Nginx WebSocket 配置正确
- 检查防火墙设置

### 4. TTS 服务无响应

- 检查 TTS 容器状态：`docker-compose logs tts`
- 确认 TTS 服务 URL 配置正确：`TTS_API_URL=http://tts:3000`
- 检查资源限制是否足够

### 5. SSL 证书问题

如果使用自签名证书，浏览器会显示安全警告，这是正常的。对于生产环境，建议使用 Let's Encrypt 或购买正式证书。

## 性能优化

### 1. 调整资源限制

编辑 `docker-compose.yml` 中的资源限制：

```yaml
tts:
  deploy:
    resources:
      limits:
        cpus: '4'      # 增加到 4 CPU
        memory: 4G     # 增加到 4GB 内存
```

### 2. 启用 Nginx 缓存

编辑 `nginx/nginx.conf`，添加缓存配置：

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g 
                 inactive=60m use_temp_path=off;

location /api/ {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    # ... 其他配置
}
```

### 3. 优化后端性能

- 增加后端容器实例数量
- 使用 Redis 缓存消息历史
- 优化数据库查询（如果使用数据库）

## 安全建议

1. **使用强密码和 API 密钥**
2. **启用 HTTPS**（生产环境必须）
3. **定期更新镜像**：`docker-compose pull && docker-compose up -d`
4. **限制容器权限**：避免使用 root 用户运行服务
5. **配置防火墙**：仅开放必要的端口
6. **定期备份数据**：备份音频文件和配置文件

## 生产环境部署

对于生产环境，建议：

1. 使用正式的 SSL 证书
2. 配置域名和 DNS 解析
3. 设置日志轮转
4. 配置监控和告警
5. 使用外部数据库（如需要）
6. 配置自动备份
7. 使用 CI/CD 自动化部署

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理旧镜像（可选）
docker image prune -f
```

## 卸载

```bash
# 停止并删除所有容器、网络、卷
docker-compose down -v

# 删除项目文件（可选）
rm -rf /path/to/CubismWebSamples
```

## 技术支持

如遇到问题，请：
1. 查看日志：`docker-compose logs -f`
2. 检查配置文件
3. 参考 Docker 官方文档
4. 提交 Issue 到项目仓库

## 许可证

本项目遵循项目根目录的 LICENSE.md 许可证。
