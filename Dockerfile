# ============================================
# Stage 1: Builder - 安装依赖 & 构建
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件，利用 Docker 缓存层
COPY package.json package-lock.json ./

# 安装所有依赖（含 devDependencies，构建需要）
RUN npm ci

# 复制源码
COPY . .

# 构建 Next.js（standalone 模式）
RUN npm run build

# ============================================
# Stage 2: Runner - 生产运行
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 只安装生产依赖（可选，standalone 模式自带 node_modules）
# 这里仅复制 standalone 产出的 node_modules

# 复制 standalone 产出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制 public 目录（如有静态资源）
COPY --from=builder /app/public ./public

# 复制 content 目录（Markdown 文章/视频数据）
COPY --from=builder /app/content ./content

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 启动命令（standalone 模式下 server.js 在 standalone 根目录）
CMD ["node", "server.js"]
