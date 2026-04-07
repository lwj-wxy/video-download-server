import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/app-error.js";
import { normalizeVideoUrl } from "../../common/normalize-video-url.js";
import { parseVideoWithYtDlp } from "../../common/yt-dlp.js";
import { env } from "../../config/env.js";

const parsePayloadSchema = z.object({
  url: z.string().url("A valid video URL is required."),
});

export type ParsePayload = z.infer<typeof parsePayloadSchema>;

export function parseParsePayload(input: unknown) {
  const result = parsePayloadSchema.safeParse(input);

  if (!result.success) {
    throw new AppError("INVALID_URL", result.error.issues[0]?.message ?? "Invalid URL.", 400);
  }

  return result.data;
}

export async function parseVideo(fastify: FastifyInstance, payload: ParsePayload) {
  const normalizedUrl = normalizeVideoUrl(payload.url);
  const cacheKey = `parse:${normalizedUrl}`;

  try {
    const cached = env.PARSE_CACHE_TTL_SECONDS > 0 ? await fastify.redis.get(cacheKey) : null;

    if (cached) {
      return JSON.parse(cached) as Awaited<ReturnType<typeof parseVideoWithYtDlp>>;
    }

    const data = await parseVideoWithYtDlp(normalizedUrl);

    if (env.PARSE_CACHE_TTL_SECONDS > 0) {
      await fastify.redis.set(cacheKey, JSON.stringify(data), "EX", env.PARSE_CACHE_TTL_SECONDS);
    }

    await fastify.prisma.videoParseRecord.create({
      data: {
        sourceUrl: normalizedUrl,
        platform: data.platform,
        parseStatus: "success",
        title: data.title,
        durationSeconds: data.duration,
      },
    });

    return data;
  } catch (error) {
    await fastify.prisma.videoParseRecord.create({
      data: {
        sourceUrl: normalizedUrl,
        platform: null,
        parseStatus: "failed",
        errorCode: "PARSE_FAILED",
        errorMessage: error instanceof Error ? error.message : "Video parse failed.",
      },
    });

    throw new AppError("PARSE_FAILED", error instanceof Error ? error.message : "Video parse failed.", 400);
  }
}
