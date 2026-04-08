# Video Download Server

This repository is the standalone backend package for the video download project.

## Included

- Fastify + TypeScript server bootstrap
- Prisma schema for parse records, download tasks, files, and usage counters
- Redis + BullMQ queue wiring
- Cookie-based anonymous visitor tracking
- MVP routes:
  - `POST /api/parse`
  - `POST /api/download`
  - `GET /api/tasks/:taskId`
  - `GET /health`

## Repository role

This package owns:

- parsing
- download task creation
- task polling
- queue + worker processing
- Prisma models
- Redis integration
- downloadable file delivery

The frontend should call this service through `NEXT_PUBLIC_API_BASE_URL`.

Frontend origins for CORS are controlled through:

- `FRONTEND_ORIGINS`

## Local setup

1. Copy `.env.example` to `.env`
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run database migration:
   - `npm run prisma:migrate`
5. Start the dev server:
   - `npm run dev`
6. Start the mock download worker in a second terminal:
   - `npm run dev:worker`

The service defaults to `http://localhost:4000`.

Default local frontend origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

## 环境变量安全与密码轮换

`.env.example` 只应该作为安全模板使用，不能放真实密钥。

- 不要把真实密码、Token、连接串提交到 `.env.example`、`.env` 截图、Issue 评论或文档示例中
- 真实值只保存在本地 `.env` 或部署平台的密钥管理中
- 如果某个密码、Token、连接串曾经被提交到 GitHub，即使后面已经改掉文件内容，也建议立即轮换

### 修改 `DATABASE_URL`

1. 打开你本地的 `.env`
2. 把 `DATABASE_URL` 替换成真实连接串，例如：
   - `DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME?schema=public`
3. 保存文件
4. 重启 API 进程，让 Prisma 和服务端重新读取新的环境变量
5. 如果这是对已有环境进行密码轮换，修改后要确认服务仍然可以正常连接数据库

### 修改 PostgreSQL 密码

请根据你的 PostgreSQL 部署方式选择对应方法。

如果 PostgreSQL 是你自己管理的：

1. 使用有权限的账号连接数据库：
   - `psql -U postgres -h YOUR_DB_HOST -d postgres`
2. 执行修改应用账号密码的 SQL：
   - `ALTER USER your_app_user WITH PASSWORD 'NEW_STRONG_PASSWORD';`
3. 同步更新本地 `.env`、服务器 `.env` 或部署平台里的 `DATABASE_URL`
4. 重启服务
5. 验证后端连接正常，`Prisma` 相关命令也能正常执行

如果数据库托管在 Neon、Supabase、Railway、Render 或其他云平台：

1. 打开对应平台控制台
2. 找到数据库凭据或重置密码页面
3. 生成一个新的强密码
4. 复制平台生成的新连接串，或者手动重建 `DATABASE_URL`
5. 更新所有使用该数据库的环境
6. 重启或重新部署后端服务

### 修改 `REDIS_URL`

1. 打开你本地的 `.env`
2. 把 `REDIS_URL` 替换成真实值，例如：
   - `REDIS_URL=redis://:REDIS_PASSWORD@REDIS_HOST:6379`
3. 保存文件
4. 重启 API 和 Worker 进程，让 BullMQ 用新凭据重新连接 Redis
5. 验证任务仍然可以正常入队和消费

### 修改 Redis 密码

如果 Redis 是你自己管理的：

1. 打开 Redis 配置并设置新密码
   - 如果是 Redis 6+ 的 ACL 模式，修改对应用户的密码
   - 如果是简单配置，修改 `redis.conf` 里的 `requirepass`
2. 重启 Redis，让配置生效
3. 更新所有使用 Redis 的 `REDIS_URL`
4. 重启 API 和 Worker 进程
5. 验证队列读写是否正常

如果你使用的是 Upstash、Redis Cloud、Railway 或其他托管 Redis 服务：

1. 打开平台控制台
2. 轮换或重新生成 Redis 密码 / 连接串
3. 复制新的 `REDIS_URL`
4. 更新所有使用 Redis 的环境
5. 重启或重新部署后端和 Worker

### 如果密钥已经提交过

1. 先轮换对应密码，不要只改文档
2. 把仓库中的示例值替换成占位符
3. 检查 Git 历史和旧提交里是否还出现过相同密钥
4. 如果 Git 历史中仍有敏感值，建议在仓库进一步公开或协作前清理历史
5. 检查 GitHub Actions、部署平台、服务器和团队成员本地环境，确认旧值已经不再使用

## Cookies for TikTok and Douyin

Some platforms need fresh browser cookies before `yt-dlp` can parse or download them reliably.

You can configure either option in `.env`:

- `YT_DLP_COOKIES_PATH`
  Use a Netscape-format cookies file, for example:
  `YT_DLP_COOKIES_PATH=C:\Users\YOUR_USER\Desktop\cookies\tiktok.txt`
- `YT_DLP_COOKIES_FROM_BROWSER`
  Let `yt-dlp` read cookies from an installed browser, for example:
  `YT_DLP_COOKIES_FROM_BROWSER=edge`
  `YT_DLP_COOKIES_FROM_BROWSER=chrome`

If both are set, both flags are passed through to `yt-dlp`, so in practice you should usually set only one.

## Performance-related env vars

- `PARSE_CACHE_TTL_SECONDS`
  Cache successful parse results in Redis. Recommended for MVP: `600`
- `DOWNLOAD_WORKER_CONCURRENCY`
  Number of download jobs a single worker process handles at once. Recommended for MVP: `2`
- `DOWNLOAD_FILE_CLEANUP_INTERVAL_MS`
  Interval for removing expired local download files and marking tasks as expired. Recommended for MVP: `600000`

## PM2 deployment

For production on a VPS, build the backend first:

- `npm install`
- `npm run prisma:generate`
- `npm run build`

Then start both backend processes with PM2:

- `pm2 start ecosystem.config.cjs`
- `pm2 save`

Useful PM2 commands:

- `pm2 status`
- `pm2 logs video-download-api`
- `pm2 logs video-download-worker`
- `pm2 restart ecosystem.config.cjs`

## Current status

- `parse` stores a successful parse record and returns mock video metadata
- `download` enforces a simple anonymous daily limit, creates a task, and pushes a BullMQ job
- `tasks/:taskId` reads task status from Prisma and returns file metadata when available
- `tasks/:taskId/file` returns a mock downloadable text file for completed tasks

## Next steps

1. Replace mock parse logic with a real parser adapter
2. Add a BullMQ worker to process download jobs and update task progress
3. Upload completed files to storage and write `DownloadFile`
4. Point the frontend to this service through environment-based API URLs
