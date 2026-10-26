export interface ViewerSample {
  /** ISO 8601 UTC timestamp of the poll */
  at: string;
  viewerCount: number;
}

export interface StreamMetrics {
  avgViewers: number;
  peakViewers: number;
  /** ESTIMATE: sum(viewer_count x interval) in hours. Not an official Twitch metric. */
  watchHoursEst: number;
  sampleCount: number;
}

/**
 * Pure aggregation over polled samples. Returns null when there is nothing to aggregate,
 * so callers send "unknown" instead of zeros.
 */
export function aggregate(samples: ViewerSample[], intervalSeconds: number): StreamMetrics | null {
  const valid = samples.filter((s) => Number.isFinite(s.viewerCount) && s.viewerCount >= 0);
  if (valid.length === 0) return null;
  const counts = valid.map((s) => s.viewerCount);
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    avgViewers: Math.round(total / counts.length),
    peakViewers: Math.max(...counts),
    watchHoursEst: Math.round(((total * intervalSeconds) / 3600) * 10) / 10,
    sampleCount: counts.length,
  };
}
