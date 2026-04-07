# Video Download Server

This directory is the standalone backend package for the video download project and is intended to become the root of:

- `https://github.com/lwj-wxy/video-download-server`

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

## Migration status

This folder is normalized so it can be copied into the standalone backend repository root with minimal changes.

See:

- [MIGRATION_READY.md](C:\Users\StandardSoftware\Desktop\my-project\video-download\backend\MIGRATION_READY.md)

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
4. Point the Next.js frontend to this service through environment-based API URLs
