import type { SyncPayload } from "../transforms/payload.js";
import { fetchWithRetry } from "./http.js";

/**
 * Sends one payload to the Airtable "Ingest Twitch sync payload" automation.
 * Each accepted POST costs ONE automation run (Free plan: 100/month), so send one payload
 * per stream at the end, not one per poll.
 */
export async function sendToAirtable(webhookUrl: string, payload: SyncPayload): Promise<void> {
  await fetchWithRetry(
    webhookUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { label: "airtable_webhook", attempts: 3 },
  );
}
