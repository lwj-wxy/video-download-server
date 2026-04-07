import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/app-error.js";
import { normalizeVideoUrl } from "../../common/normalize-video-url.js";
import { detectPlatform } from "../../common/platform.js";
import { env } from "../../config/env.js";

const DAILY_FREE_LIMIT = 3;
const USAGE_METRIC_KEY = "download_requests";

const downloadPayloadSchema = z.object({
  url: z.string().url("A valid video URL is required."),
  format: z.string().trim().min(1, "A download format is required."),
  formatId: z.string().trim().min(1).optional(),
  resolution: z.string().trim().min(1).optional(),
  audioOnly: z.boolean().optional(),
  title: z.string().trim().min(1).optional(),
});

export type DownloadPayload = z.infer<typeof downloadPayloadSchema>;

function getTodayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function parseDownloadPayload(input: unknown) {
  const result = downloadPayloadSchema.safeParse(input);

  if (!result.success) {
    throw new AppError(
      "INVALID_DOWNLOAD_REQUEST",
      result.error.issues[0]?.message ?? "Missing required download parameters.",
      400,
    );
  }

  return result.data;
}

async function incrementDailyUsage(fastify: FastifyInstance, visitorId: string) {
  const { start, end } = getTodayRange();

  const currentCounter = await fastify.prisma.usageCounter.findUnique({
    where: {
      visitorId_metricKey_periodStart_periodEnd: {
        visitorId,
        metricKey: USAGE_METRIC_KEY,
        periodStart: start,
        periodEnd: end,
      },
    },
  });

  if (currentCounter && currentCounter.value >= DAILY_FREE_LIMIT) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      "Daily download limit reached for the current visitor.",
      429,
    );
  }

  await fastify.prisma.usageCounter.upsert({
    where: {
      visitorId_metricKey_periodStart_periodEnd: {
        visitorId,
        metricKey: USAGE_METRIC_KEY,
        periodStart: start,
        periodEnd: end,
      },
    },
    update: {
      value: {
        increment: 1,
      },
    },
    create: {
      visitorId,
      metricKey: USAGE_METRIC_KEY,
      periodStart: start,
      periodEnd: end,
      value: 1,
    },
  });
}

export async function createDownloadTask(
  fastify: FastifyInstance,
  visitorId: string,
  payload: DownloadPayload,
) {
  await incrementDailyUsage(fastify, visitorId);
  const normalizedUrl = normalizeVideoUrl(payload.url);

  const platform = detectPlatform(normalizedUrl);

  const task = await fastify.prisma.downloadTask.create({
    data: {
      visitorId,
      sourceUrl: normalizedUrl,
      platform,
      title: payload.title ?? "Untitled download",
      requestedFormat: payload.format,
      requestedResolution: payload.resolution,
      audioOnly: payload.audioOnly ?? false,
      planCode: "free",
      status: "pending",
      progress: 0,
    },
  });

  const job = await fastify.downloadQueue.add(
    "download",
    {
      taskId: task.id,
      visitorId,
      formatId: payload.formatId ?? "best",
    },
    {
      attempts: env.DOWNLOAD_JOB_ATTEMPTS,
      backoff: {
        type: "fixed",
        delay: env.DOWNLOAD_JOB_BACKOFF_MS,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  const queuedTask = await fastify.prisma.downloadTask.update({
    where: {
      id: task.id,
    },
    data: {
      status: "queued",
      queueJobId: job.id ?? null,
    },
  });

  return {
    taskId: queuedTask.id,
    status: queuedTask.status,
    selectedFormat: queuedTask.requestedFormat,
    selectedResolution: queuedTask.requestedResolution ?? "720p",
    downloadUrl: null,
  };
}
