// The band's recording (R-06.7, T-2602): which files are taken, and its waveform, computed in the
// browser before uploading so the player draws it without downloading the file.

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const PEAK_COUNT = 1000;

/** The file's audio type as the bucket takes it, from its type or its name; null if refused. */
export function audioType(file: { name: string; type: string }): string | null {
  const type = file.type.toLowerCase();
  if (type === "audio/mpeg" || type === "audio/mp3") return "audio/mpeg";
  if (type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/m4a") return "audio/mp4";
  if (type === "" || type === "application/octet-stream") {
    const name = file.name.toLowerCase();
    if (name.endsWith(".mp3")) return "audio/mpeg";
    if (name.endsWith(".m4a")) return "audio/mp4";
  }
  return null;
}

/** Why a file can't be the band's recording, or null when it can. */
export function audioProblem(file: {
  name: string;
  type: string;
  size: number;
}): "type" | "size" | null {
  if (!audioType(file)) return "type";
  if (file.size > MAX_AUDIO_BYTES) return "size";
  return null;
}

/**
 * The waveform: for each of `count` equal stretches of the recording, its loudest sample over the
 * channels, from 0 to 1000.
 */
export function peaksFrom(channels: readonly Float32Array[], count = PEAK_COUNT): number[] {
  const length = channels[0]?.length ?? 0;
  if (length === 0) return [];
  const stretches = Math.min(count, length);
  const out: number[] = [];
  for (let stretch = 0; stretch < stretches; stretch++) {
    const from = Math.floor((stretch * length) / stretches);
    const to = Math.floor(((stretch + 1) * length) / stretches);
    let loudest = 0;
    for (const channel of channels)
      for (let at = from; at < to; at++) {
        const sample = Math.abs(channel[at] ?? 0);
        if (sample > loudest) loudest = sample;
      }
    out.push(Math.round(Math.min(loudest, 1) * 1000));
  }
  return out;
}
