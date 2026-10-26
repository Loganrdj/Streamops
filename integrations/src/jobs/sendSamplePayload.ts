import { sendToAirtable } from "../clients/airtableWebhook.js";
import { log } from "../observability/log.js";
import { buildPayload, validatePayload } from "../transforms/payload.js";

/**
 * Sends ONE synthetic payload so Airtable can capture the webhook schema.
 * Run it while the automation is OFF: Airtable then only records the sample and uses no run.
 * Needs AIRTABLE_WEBHOOK_URL and STREAMOPS_SHARED_TOKEN in the environment (Twitch vars not needed).
 */
async function main() {
  const url = process.env.AIRTABLE_WEBHOOK_URL;
  const token = process.env.STREAMOPS_SHARED_TOKEN;
  if (!url || !token) throw new Error("Set AIRTABLE_WEBHOOK_URL and STREAMOPS_SHARED_TOKEN");

  const payload = buildPayload({
    sharedToken: token,
    platformStreamId: "4100000099",
    title: "Sample stream (schema capture)",
    status: "Completed",
    startedAt: "2026-10-26T16:00:00.000Z",
    endedAt: "2026-10-26T18:00:00.000Z",
    sourceUpdatedAt: "2026-10-26T18:01:00.000Z",
    metrics: { avgViewers: 400, peakViewers: 610, watchHoursEst: 800, sampleCount: 24 },
  });
  const errors = validatePayload(payload);
  if (errors.length) throw new Error(errors.join("; "));
  await sendToAirtable(url, payload);
  log("info", "sample_sent", { platform_stream_id: payload.platform_stream_id });
}

main().catch((err) => {
  log("error", "sample_failed", { error: String(err) });
  process.exit(1);
});
