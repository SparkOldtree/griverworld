# ============================================
# Stage 1: Builder - 安装依赖 & 构建
# （node:24 默认启用 node:sqlite，无需 --experimental-sqlite 标志）
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

# 复制 package 文件，利用 Docker 缓存层
COPY package.json package-lock.json ./

# 安装所有依赖（含 devDependencies，构建需要）
# 使用国内镜像源（npmmirror 阿里云），--replace-registry-host 强制替换 lock 文件中的 registry.npmjs.org 下载地址
RUN npm ci --registry=https://registry.npmmirror.com --replace-registry-host=always

# 复制源码
COPY . .

# 构建时传入 UMAMI_WEBSITE_ID（Next.js 在 layout 中静态求值，须在构建期可见）
ARG UMAMI_WEBSITE_ID
ENV UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID}

# 构建 Next.js（standalone 模式）
RUN npm run build

# ============================================
# Stage 2: Runner - 生产运行（最小化镜像）
# ============================================
FROM node:24-alpine AS runner

WORKDIR /app

# 创建非 root 用户运行应用
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 standalone 产出（包含精简的 node_modules）
COPY --from=builder /app/.next/standalone ./

# 复制静态资源
COPY --from=builder /app/.next/static ./.next/static

# 复制 public 目录（如有静态资源）
COPY --from=builder /app/public ./public

# 复制 content 目录（Markdown 文章/视频数据）
COPY --from=builder /app/content ./content

# 复制数据采集脚本与 lib（服务器容器内执行 fetch-indexes.mjs / fetch-indicators.mjs）
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib ./src/lib

# 创建可写的 Next.js 缓存目录（unstable_cache / prerender cache 需要，否则 EACCES）
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

# 切换到非 root 用户
USER nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 启动命令（standalone 模式下 server.js 在 standalone 根目录）
CMD ["node", "server.js"]
