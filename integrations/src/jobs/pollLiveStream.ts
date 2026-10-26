import { sendToAirtable } from "../clients/airtableWebhook.js";
import { TwitchClient } from "../clients/twitch.js";
import { loadConfig } from "../config.js";
import { log } from "../observability/log.js";
import { aggregate } from "../transforms/aggregate.js";
import { buildPayload, validatePayload } from "../transforms/payload.js";
import { SampleStore } from "./sampleStore.js";

/**
 * Long-running poller for one channel.
 *  - While live: append a viewer sample to the local session file every interval.
 *  - When the stream goes offline: aggregate, validate, send ONE payload to Airtable, then archive.
 * The post-stream sync is driven by the stream actually ending, not by its planned end time
 * (the root cause of the "Volt Energy" stale-data demo).
 */
async function tick(twitch: TwitchClient, store: SampleStore, cfg: ReturnType<typeof loadConfig>) {
  const live = await twitch.getLiveStream(cfg.broadcasterId);
  const now = new Date().toISOString();

  if (live) {
    const session = (await store.load(live.id)) ?? {
      platformStreamId: live.id,
      title: live.title,
      startedAt: live.startedAt,
      samples: [],
    };
    session.title = live.title;
    session.samples.push({ at: now, viewerCount: live.viewerCount });
    await store.save(session);
    log("info", "sample_recorded", { platformStreamId: live.id, viewers: live.viewerCount, samples: session.samples.length });
    return;
  }

  const pendingId = await store.current();
  if (!pendingId) {
    log("debug", "offline_idle");
    return;
  }

  const session = await store.load(pendingId);
  if (!session) return;
  const lastSample = session.samples.at(-1)?.at ?? now;
  const payload = buildPayload({
    sharedToken: cfg.sharedToken,
    platformStreamId: session.platformStreamId,
    title: session.title,
    status: "Completed",
    startedAt: session.startedAt,
    endedAt: lastSample,
    sourceUpdatedAt: lastSample,
    metrics: aggregate(session.samples, cfg.pollIntervalSeconds),
  });

  const errors = validatePayload(payload);
  if (errors.length > 0) {
    log("error", "payload_invalid", { platformStreamId: session.platformStreamId, errors });
    return; // keep the session file so a human can fix and resend
  }

  await sendToAirtable(cfg.airtableWebhookUrl, payload);
  await store.archive(session.platformStreamId);
  log("info", "stream_synced", { platformStreamId: session.platformStreamId, sampleCount: payload.sample_count });
}

async function main() {
  const cfg = loadConfig();
  const twitch = new TwitchClient(cfg.twitchClientId, cfg.twitchClientSecret);
  const store = new SampleStore(cfg.samplesDir);
  log("info", "poller_started", { intervalSeconds: cfg.pollIntervalSeconds });

  for (;;) {
    try {
      await tick(twitch, store, cfg);
    } catch (err) {
      // Errors stay local and visible; the session file is untouched, so the next tick retries.
      log("error", "tick_failed", { error: err instanceof Error ? err.message : String(err) });
    }
    await new Promise((r) => setTimeout(r, cfg.pollIntervalSeconds * 1000));
  }
}

main();
