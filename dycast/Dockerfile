# 多阶段构建 - 构建阶段
FROM node:23-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，因为构建需要）
RUN npm ci && \
    npm cache clean --force

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 生产阶段 - 使用 Nginx
FROM node:23-alpine

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 package.json 和 node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 5173

# 启动 Nginx
CMD ["npm", "run", "dev"]
