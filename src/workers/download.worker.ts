import { stat } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../config/env.js";
import { downloadVideoWithYtDlp } from "../common/yt-dlp.js";

type DownloadJobData = {
  taskId: string;
  visitorId: string;
  formatId: string;
};

const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<DownloadJobData>(
  env.DOWNLOAD_QUEUE_NAME,
  async (job) => {
    const task = await prisma.downloadTask.findUnique({
      where: {
        id: job.data.taskId,
      },
    });

    if (!task) {
      throw new Error(`Task ${job.data.taskId} not found.`);
    }

    await prisma.downloadTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: "processing",
        progress: 35,
        startedAt: new Date(),
      },
    });

    try {
      const filePath = await downloadVideoWithYtDlp(task.id, task.sourceUrl, job.data.formatId);
      const fileStats = await stat(filePath);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
      const fileName = path.basename(filePath);

      await prisma.downloadTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          expiresAt,
          errorCode: null,
          errorMessage: null,
          file: {
            upsert: {
              update: {
                storageProvider: "local",
                fileName,
                fileSize: BigInt(fileStats.size),
                mimeType: `video/${path.extname(fileName).replace(".", "") || "mp4"}`,
                publicUrl: `${env.APP_BASE_URL}/api/tasks/${task.id}/file`,
                signedUrlExpiresAt: expiresAt,
              },
              create: {
                storageProvider: "local",
                fileName,
                fileSize: BigInt(fileStats.size),
                mimeType: `video/${path.extname(fileName).replace(".", "") || "mp4"}`,
                publicUrl: `${env.APP_BASE_URL}/api/tasks/${task.id}/file`,
                signedUrlExpiresAt: expiresAt,
              },
            },
          },
        },
      });

      return {
        taskId: task.id,
        status: "completed",
      };
    } catch (error) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      await prisma.downloadTask.update({
        where: {
          id: task.id,
        },
        data: {
          status: isLastAttempt ? "failed" : "queued",
          progress: 0,
          errorCode: isLastAttempt ? "DOWNLOAD_FAILED" : null,
          errorMessage: isLastAttempt
            ? error instanceof Error
              ? error.message
              : "Download failed."
            : null,
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: env.DOWNLOAD_WORKER_CONCURRENCY,
  },
);

worker.on("completed", (job) => {
  console.log(`[download-worker] completed job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[download-worker] failed job ${job?.id ?? "unknown"}:`, error);
});

async function shutdown() {
  await worker.close();
  await redis.quit();
  await prisma.$disconnect();
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

console.log(`[download-worker] listening on queue "${env.DOWNLOAD_QUEUE_NAME}"`);
