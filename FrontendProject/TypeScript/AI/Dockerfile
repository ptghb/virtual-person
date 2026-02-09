# 多阶段构建 - 构建阶段
FROM node:23-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（从构建上下文根目录）
COPY ./FrontendProject/TypeScript/AI/package*.json ./

# 安装所有依赖（包括 devDependencies，因为构建需要）
RUN npm ci && \
    npm cache clean --force

# 复制源代码（从构建上下文根目录）
COPY ./FrontendProject/TypeScript/AI ./

# 复制 Framework 目录（从构建上下文根目录）
COPY ./Framework ./Framework

# 构建项目
RUN npm run build:prod

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 nginx 配置（如果需要）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
