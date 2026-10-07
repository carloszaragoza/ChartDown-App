// Reports (R-07.2, T-1305): why a version is hidden, from what people reported about it.

/** Lyrics if any open report says the version has full lyrics, otherwise other. */
export function hideReason(reports: readonly { reason: string }[]): "lyrics" | "other" {
  return reports.some((report) => report.reason === "lyrics") ? "lyrics" : "other";
}
