import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { env } from "../config/env.js";

export type ParsedDownloadFormat = {
  formatId: string;
  format: string;
  resolution: string;
  fileSize: number;
  audioOnly: boolean;
  ext: string;
};

type YtDlpFormat = {
  format_id?: string;
  ext?: string;
  resolution?: string;
  format_note?: string;
  filesize?: number | null;
  filesize_approx?: number | null;
  vcodec?: string;
  acodec?: string;
};

type YtDlpMetadata = {
  id?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  extractor_key?: string;
  formats?: YtDlpFormat[];
};

type FfprobeStream = {
  codec_type?: string;
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
};

type RunCommandOptions = {
  cwd?: string;
  timeoutMs?: number;
};

function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        child.kill();
        reject(new Error(`Command timed out after ${options.timeoutMs}ms.`));
      }, options.timeoutMs);
    }

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `Command failed with exit code ${code}.`));
    });
  });
}

export function getTaskDownloadDirectory(taskId: string) {
  return path.resolve(process.cwd(), env.DOWNLOAD_STORAGE_DIR, taskId);
}

export async function ensureTaskDownloadDirectory(taskId: string) {
  const directory = getTaskDownloadDirectory(taskId);
  await mkdir(directory, { recursive: true });
  return directory;
}

function getCookiesArgs() {
  const args: string[] = [];

  if (env.YT_DLP_COOKIES_PATH) {
    args.push("--cookies", env.YT_DLP_COOKIES_PATH);
  }

  if (env.YT_DLP_COOKIES_FROM_BROWSER) {
    args.push("--cookies-from-browser", env.YT_DLP_COOKIES_FROM_BROWSER);
  }

  return args;
}

function toDownloadFormats(metadata: YtDlpMetadata): ParsedDownloadFormat[] {
  const formats = metadata.formats ?? [];

  const progressiveFormats = formats
    .filter((item) => item.format_id && item.vcodec && item.vcodec !== "none" && item.acodec && item.acodec !== "none")
    .map((item) => ({
      formatId: item.format_id!,
      format: item.ext ?? "mp4",
      resolution: item.resolution ?? item.format_note ?? "unknown",
      fileSize: Number(item.filesize ?? item.filesize_approx ?? 0),
      audioOnly: false,
      ext: item.ext ?? "mp4",
    }))
    .filter((item) => item.format === "mp4" || item.format === "webm");

  const uniqueFormats = new Map<string, ParsedDownloadFormat>();

  for (const format of progressiveFormats) {
    const key = `${format.formatId}-${format.resolution}-${format.format}`;
    if (!uniqueFormats.has(key)) {
      uniqueFormats.set(key, format);
    }
  }

  const sortedFormats = Array.from(uniqueFormats.values()).sort((left, right) => {
    const leftPixels = Number.parseInt(left.resolution, 10);
    const rightPixels = Number.parseInt(right.resolution, 10);
    return rightPixels - leftPixels;
  });

  return sortedFormats.length > 0
    ? sortedFormats
    : [
        {
          formatId: "best",
          format: "mp4",
          resolution: "best",
          fileSize: 0,
          audioOnly: false,
          ext: "mp4",
        },
      ];
}

export async function parseVideoWithYtDlp(url: string) {
  const { stdout } = await runCommand(env.YT_DLP_BIN, [
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    ...getCookiesArgs(),
    url,
  ]);

  const metadata = JSON.parse(stdout) as YtDlpMetadata;
  const formats = toDownloadFormats(metadata);

  return {
    title: metadata.title ?? "Untitled video",
    coverUrl: metadata.thumbnail ?? "",
    platform: metadata.extractor_key?.toLowerCase() ?? "generic",
    duration: metadata.duration ?? 0,
    formats,
  };
}

function buildFormatSelector(formatId?: string) {
  // Keep fallbacks video-only so a "successful" download never degrades to audio-only.
  const bestVideoSelector =
    "bestvideo*[ext=mp4]+bestaudio[ext=m4a]/bestvideo*+bestaudio/best*[vcodec!=none][ext=mp4]/best*[vcodec!=none]";

  if (!formatId || formatId === "best") {
    return bestVideoSelector;
  }

  return `${formatId}/${bestVideoSelector}`;
}

async function assertDownloadedFileHasVideo(filePath: string) {
  const { stdout } = await runCommand(env.FFPROBE_BIN, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    filePath,
  ]);

  const metadata = JSON.parse(stdout) as FfprobeOutput;
  const hasVideoStream = (metadata.streams ?? []).some((stream) => stream.codec_type === "video");

  if (!hasVideoStream) {
    throw new Error("The downloaded file does not contain a video stream.");
  }
}

export async function downloadVideoWithYtDlp(taskId: string, url: string, formatId?: string) {
  const outputDirectory = await ensureTaskDownloadDirectory(taskId);
  const formatSelector = buildFormatSelector(formatId);
  const outputTemplate = path.join(outputDirectory, `video-${taskId}.%(ext)s`);

  const { stdout } = await runCommand(env.YT_DLP_BIN, [
    "--no-playlist",
    "--no-warnings",
    "--newline",
    ...getCookiesArgs(),
    "--ffmpeg-location",
    path.dirname(env.FFMPEG_BIN),
    "--merge-output-format",
    "mp4",
    "-f",
    formatSelector,
    "-o",
    outputTemplate,
    "--print",
    "after_move:filepath",
    url,
  ], {
    timeoutMs: env.DOWNLOAD_JOB_TIMEOUT_MS,
  });

  const filePath = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!filePath) {
    throw new Error("yt-dlp did not return a downloaded file path.");
  }

  const resolvedFilePath = path.resolve(filePath);
  await assertDownloadedFileHasVideo(resolvedFilePath);

  return resolvedFilePath;
}
