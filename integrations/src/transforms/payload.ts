import type { StreamMetrics } from "./aggregate.js";

/**
 * Contract between the fetcher and the Airtable webhook automation.
 * Keep in sync with docs/api-contracts.md. Field names are snake_case, timestamps are UTC ISO 8601.
 */
export interface SyncPayload {
  shared_token: string;
  source_system: "Twitch API";
  platform_stream_id: string;
  title: string;
  status: "Live" | "Completed";
  started_at: string;
  ended_at: string | null;
  source_updated_at: string;
  synced_at: string;
  avg_viewers: number | null;
  peak_viewers: number | null;
  watch_hours_est: number | null;
  sample_count: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function buildPayload(args: {
  sharedToken: string;
  platformStreamId: string;
  title: string;
  status: "Live" | "Completed";
  startedAt: string;
  endedAt: string | null;
  sourceUpdatedAt: string;
  metrics: StreamMetrics | null;
  now?: Date;
}): SyncPayload {
  return {
    shared_token: args.sharedToken,
    source_system: "Twitch API",
    platform_stream_id: args.platformStreamId,
    title: args.title,
    status: args.status,
    started_at: args.startedAt,
    ended_at: args.endedAt,
    source_updated_at: args.sourceUpdatedAt,
    synced_at: (args.now ?? new Date()).toISOString(),
    avg_viewers: args.metrics?.avgViewers ?? null,
    peak_viewers: args.metrics?.peakViewers ?? null,
    watch_hours_est: args.metrics?.watchHoursEst ?? null,
    sample_count: args.metrics?.sampleCount ?? 0,
  };
}

/** Validate before sending, so bad data becomes a local error instead of a bad Airtable record. */
export function validatePayload(p: SyncPayload): string[] {
  const errors: string[] = [];
  if (!p.shared_token) errors.push("shared_token is empty");
  if (!/^\d+$/.test(p.platform_stream_id)) errors.push("platform_stream_id must be numeric");
  if (!p.title.trim()) errors.push("title is empty");
  for (const key of ["started_at", "source_updated_at", "synced_at"] as const) {
    if (!ISO.test(p[key])) errors.push(`${key} must be UTC ISO 8601`);
  }
  if (p.ended_at !== null && !ISO.test(p.ended_at)) errors.push("ended_at must be UTC ISO 8601 or null");
  if (p.status === "Completed" && p.ended_at === null) errors.push("Completed stream needs ended_at");
  if (p.ended_at && p.ended_at < p.started_at) errors.push("ended_at is before started_at");
  if (p.avg_viewers !== null && p.peak_viewers !== null && p.avg_viewers > p.peak_viewers) {
    errors.push("avg_viewers exceeds peak_viewers");
  }
  return errors;
}
