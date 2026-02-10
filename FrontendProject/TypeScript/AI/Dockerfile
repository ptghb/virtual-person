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
FROM node:23-alpine

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 package.json 和 node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["npm", "run", "serve"]
