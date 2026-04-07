import { rm } from "node:fs/promises";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";

async function expireCompletedDownloads(app: FastifyInstance) {
  const expiredTasks = await app.prisma.downloadTask.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
      file: {
        isNot: null,
      },
    },
    include: {
      file: true,
    },
    take: 50,
  });

  for (const task of expiredTasks) {
    const downloadDirectory = path.resolve(process.cwd(), env.DOWNLOAD_STORAGE_DIR, task.id);

    try {
      await rm(downloadDirectory, { recursive: true, force: true });
    } catch (error) {
      app.log.warn({ taskId: task.id, error }, "Failed to remove expired download directory.");
    }

    await app.prisma.downloadFile.deleteMany({
      where: {
        taskId: task.id,
      },
    });

    await app.prisma.downloadTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: "expired",
      },
    });
  }
}

export function startDownloadCleanup(app: FastifyInstance) {
  void expireCompletedDownloads(app);

  const interval = setInterval(() => {
    void expireCompletedDownloads(app);
  }, env.DOWNLOAD_FILE_CLEANUP_INTERVAL_MS);

  interval.unref?.();

  app.addHook("onClose", async () => {
    clearInterval(interval);
  });
}
