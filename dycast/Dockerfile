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

# 运行阶段
# 这里保留源码并运行 Vite dev server，是因为 dycast 依赖 Vite 的 /dylive 和 /socket 代理。
FROM node:23-alpine

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
