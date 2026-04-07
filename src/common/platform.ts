const PLATFORM_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "youtube", pattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i },
  { platform: "tiktok", pattern: /(^|\.)tiktok\.com$/i },
  { platform: "instagram", pattern: /(^|\.)instagram\.com$/i },
  { platform: "facebook", pattern: /(^|\.)facebook\.com$|(^|\.)fb\.watch$/i },
  { platform: "twitter", pattern: /(^|\.)x\.com$|(^|\.)twitter\.com$/i },
];

export function detectPlatform(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  const match = PLATFORM_PATTERNS.find((item) => item.pattern.test(hostname));

  return match?.platform ?? "generic";
}
