const TRACKING_PARAMS = new Set([
  "si",
  "feature",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

export function normalizeVideoUrl(input: string) {
  const url = new URL(input.trim());

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  const nextParams = new URLSearchParams();

  Array.from(url.searchParams.entries())
    .filter(([key]) => !TRACKING_PARAMS.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      nextParams.append(key, value);
    });

  url.search = nextParams.toString();

  return url.toString();
}
