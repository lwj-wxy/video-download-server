# Repository Mapping For Extraction

This document maps the current prepared backend package to the future standalone repository root.

## Copy mapping

Current location in frontend repo:

- [backend](C:\Users\StandardSoftware\Desktop\my-project\video-download\backend)

Target location:

- `video-download-server/`

## Directory mapping

- `backend/src/` -> `video-download-server/src/`
- `backend/prisma/` -> `video-download-server/prisma/`
- `backend/.env.example` -> `video-download-server/.env.example`
- `backend/.gitignore` -> `video-download-server/.gitignore`
- `backend/package.json` -> `video-download-server/package.json`
- `backend/package-lock.json` -> `video-download-server/package-lock.json`
- `backend/tsconfig.json` -> `video-download-server/tsconfig.json`
- `backend/ecosystem.config.cjs` -> `video-download-server/ecosystem.config.cjs`
- `backend/README.md` -> `video-download-server/README.md`
- `backend/MIGRATION_READY.md` -> `video-download-server/MIGRATION_READY.md`
- `backend/FIRST_COMMIT_CHECKLIST.md` -> `video-download-server/FIRST_COMMIT_CHECKLIST.md`

## Do not copy

- `backend/.env`
- generated logs
- `node_modules/`
- `dist/`
- `storage/`

## Prisma rule

Use:

- `backend/prisma/schema.prisma`

Do not promote the frontend root schema as the initial server schema:

- `prisma/schema.prisma`

## Expected first state after copy

The new repository root should be runnable with:

```bash
npm install
npm run prisma:generate
npm run check
npm run build
```
