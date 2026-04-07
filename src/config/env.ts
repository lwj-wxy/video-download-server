import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.string().default("development"),
  FRONTEND_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DOWNLOAD_QUEUE_NAME: z.string().default("download-jobs"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  WORKER_MOCK_DELAY_MS: z.coerce.number().default(1200),
  YT_DLP_BIN: z.string().default("yt-dlp"),
  FFMPEG_BIN: z.string().default("ffmpeg"),
  FFPROBE_BIN: z.string().default("ffprobe"),
  YT_DLP_COOKIES_PATH: z.string().trim().optional(),
  YT_DLP_COOKIES_FROM_BROWSER: z.string().trim().optional(),
  PARSE_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(600),
  DOWNLOAD_STORAGE_DIR: z.string().default("storage/downloads"),
  DOWNLOAD_JOB_ATTEMPTS: z.coerce.number().int().min(1).default(3),
  DOWNLOAD_JOB_BACKOFF_MS: z.coerce.number().int().min(1000).default(5000),
  DOWNLOAD_WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(1),
  DOWNLOAD_JOB_TIMEOUT_MS: z.coerce.number().int().min(10000).default(180000),
  DOWNLOAD_FILE_CLEANUP_INTERVAL_MS: z.coerce.number().int().min(60000).default(600000),
});

export const env = envSchema.parse(process.env);
