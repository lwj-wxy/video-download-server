# First Commit Checklist For `video-download-server`

Use this when copying the prepared backend package into the new repository.

## Files that should exist in the first commit

- `.env.example`
- `.gitignore`
- `README.md`
- `MIGRATION_READY.md`
- `FIRST_COMMIT_CHECKLIST.md`
- `ecosystem.config.cjs`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `prisma/schema.prisma`
- `src/app.ts`
- `src/server.ts`
- `src/common/*`
- `src/config/*`
- `src/modules/*`
- `src/plugins/*`
- `src/services/*`
- `src/types/*`
- `src/workers/*`

## Files that should NOT be copied into the first commit

- `.env`
- `node_modules/`
- `dist/`
- `storage/`
- `*.log`

## Prisma decision for first commit

Commit this schema:

- `backend/prisma/schema.prisma`

Do not use the frontend root schema as the initial backend schema:

- `prisma/schema.prisma`

## Commands to run after copy

```bash
npm install
npm run prisma:generate
npm run check
npm run build
```

## Manual validations before pushing

- `.env.example` has all required runtime variables
- PM2 config does not depend on a nested `backend/` folder
- README reads like a standalone backend repository
- API routes still match frontend expectations
- Worker entry path is correct

## Suggested first commit scope

Commit message idea:

```text
chore: initialize standalone video-download-server backend
```
