# Migration Ready Notes

This directory is prepared to be copied into the root of:

- `video-download-server`

## Expected standalone layout

```text
video-download-server/
  .env.example
  .gitignore
  ecosystem.config.cjs
  package.json
  package-lock.json
  README.md
  tsconfig.json
  prisma/
    schema.prisma
  src/
    app.ts
    server.ts
    common/
    config/
    modules/
    plugins/
    services/
    types/
    workers/
```

## Already normalized for migration

- package name uses `video-download-server`
- PM2 config now assumes repository root instead of `./backend`
- `.env.example` exists
- `.gitignore` exists
- API routes, worker entry, Prisma, and queue wiring are self-contained here
- generated output, logs, and local runtime folders have been cleared from the migration source

## Copy order

1. Copy the full `backend/` directory contents into the new repository root
2. Copy or regenerate `package-lock.json`
3. Run `npm install`
4. Run `npm run prisma:generate`
5. Run `npm run check`
6. Run `npm run build`
7. Start API with `npm run dev`
8. Start worker with `npm run dev:worker`

## Prisma source of truth

Use:

- `backend/prisma/schema.prisma`

Avoid using the frontend root schema for the first backend extraction because it contains broader future-phase entities not yet required by the running service.

## After moving out

These items can then be removed from the frontend repository when the new server repo is validated:

- `backend/`
- duplicated backend references in frontend docs
