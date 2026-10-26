import { describe, expect, it } from "vitest";
import { redact } from "../src/observability/log.js";
import { aggregate } from "../src/transforms/aggregate.js";
import { buildPayload, validatePayload } from "../src/transforms/payload.js";

describe("aggregate", () => {
  it("returns null (unknown), not zeros, when there are no samples", () => {
    expect(aggregate([], 300)).toBeNull();
  });

  it("computes avg, peak and estimated watch hours", () => {
    const m = aggregate(
      [
        { at: "2026-10-26T16:00:00Z", viewerCount: 100 },
        { at: "2026-10-26T16:05:00Z", viewerCount: 300 },
      ],
      300,
    );
    expect(m).toEqual({ avgViewers: 200, peakViewers: 300, watchHoursEst: 33.3, sampleCount: 2 });
  });

  it("ignores invalid samples", () => {
    const m = aggregate(
      [
        { at: "x", viewerCount: Number.NaN },
        { at: "y", viewerCount: 50 },
      ],
      60,
    );
    expect(m?.sampleCount).toBe(1);
  });
});

describe("payload validation", () => {
  const base = {
    sharedToken: "t",
    platformStreamId: "4100000001",
    title: "Test",
    status: "Completed" as const,
    startedAt: "2026-10-26T16:00:00.000Z",
    endedAt: "2026-10-26T18:00:00.000Z",
    sourceUpdatedAt: "2026-10-26T18:00:00.000Z",
    metrics: null,
    now: new Date("2026-10-26T18:05:00.000Z"),
  };

  it("accepts a well-formed payload and sends nulls for unknown metrics", () => {
    const p = buildPayload(base);
    expect(validatePayload(p)).toEqual([]);
    expect(p.avg_viewers).toBeNull();
  });

  it("rejects a completed stream without an end time", () => {
    expect(validatePayload(buildPayload({ ...base, endedAt: null }))).toContain(
      "Completed stream needs ended_at",
    );
  });

  it("rejects non-numeric platform ids and reversed times", () => {
    const errors = validatePayload(
      buildPayload({ ...base, platformStreamId: "abc", endedAt: "2026-10-26T15:00:00.000Z" }),
    );
    expect(errors).toContain("platform_stream_id must be numeric");
    expect(errors).toContain("ended_at is before started_at");
  });
});

describe("redact", () => {
  it("never lets secrets reach logs", () => {
    expect(redact({ access_token: "abc", nested: { webhookUrl: "https://x" }, ok: 1 })).toEqual({
      access_token: "[redacted]",
      nested: { webhookUrl: "[redacted]" },
      ok: 1,
    });
  });
});
