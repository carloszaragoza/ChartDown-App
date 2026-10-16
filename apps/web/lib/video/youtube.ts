// A YouTube link as the video it points to (R-03.11, T-2501): the player embeds a video by its id.

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id of a YouTube address (watch, youtu.be, embed, shorts, live), or null. */
export function videoId(address: string): string | null {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  }
  return id && ID.test(id) ? id : null;
}

/** Where a link starts playing, from its t= parameter ("90", "1m30s"), in seconds. */
export function startSeconds(address: string): number {
  let value: string | null = null;
  try {
    value = new URL(address.trim()).searchParams.get("t");
  } catch {
    return 0;
  }
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
