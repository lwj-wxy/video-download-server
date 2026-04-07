import { createReadStream } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import { AppError } from "../../common/app-error.js";
import { env } from "../../config/env.js";

export async function getTaskDetail(fastify: FastifyInstance, taskId: string) {
  const task = await fastify.prisma.downloadTask.findUnique({
    where: {
      id: taskId,
    },
    include: {
      file: true,
    },
  });

  if (!task) {
    throw new AppError("TASK_NOT_FOUND", "Task not found.", 404);
  }

  return {
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    error: task.errorCode
      ? {
          code: task.errorCode,
          message: task.errorMessage ?? "Task failed.",
        }
      : null,
    downloadUrl: task.file?.publicUrl ?? null,
    file: task.file
      ? {
          fileName: task.file.fileName,
          fileSize: task.file.fileSize ? Number(task.file.fileSize) : null,
          mimeType: task.file.mimeType,
          expiresAt: task.file.signedUrlExpiresAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function getTaskFilePayload(fastify: FastifyInstance, taskId: string) {
  const task = await fastify.prisma.downloadTask.findUnique({
    where: {
      id: taskId,
    },
    include: {
      file: true,
    },
  });

  if (!task) {
    throw new AppError("TASK_NOT_FOUND", "Task not found.", 404);
  }

  if (!task.file || !task.file.publicUrl) {
    throw new AppError("FILE_NOT_READY", "Download file is not ready yet.", 409);
  }

  return {
    fileName: task.file.fileName,
    mimeType: task.file.mimeType ?? "application/octet-stream",
    stream: createReadStream(path.resolve(process.cwd(), env.DOWNLOAD_STORAGE_DIR, task.id, task.file.fileName)),
  };
}
