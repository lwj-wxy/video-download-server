# Target File Tree For `video-download-server`

After extraction, the standalone repository should look like this:

```text
video-download-server/
  .env.example
  .gitignore
  ecosystem.config.cjs
  FIRST_COMMIT_CHECKLIST.md
  MIGRATION_READY.md
  README.md
  REPOSITORY_MAPPING.md
  TARGET_FILE_TREE.md
  package-lock.json
  package.json
  tsconfig.json
  prisma/
    schema.prisma
  src/
    app.ts
    server.ts
    common/
      app-error.ts
      normalize-video-url.ts
      platform.ts
      visitor.ts
      yt-dlp.ts
    config/
      env.ts
    modules/
      download/
        download.route.ts
        download.service.ts
      parse/
        parse.route.ts
        parse.service.ts
      task/
        task.route.ts
        task.service.ts
    plugins/
      cookie.ts
      prisma.ts
      queue.ts
      redis.ts
    services/
      download-cleanup.ts
    types/
      fastify.d.ts
    workers/
      download.worker.ts
```

## Runtime folders that should not be committed

- `dist/`
- `node_modules/`
- `storage/`
- local log files
- `.env`
