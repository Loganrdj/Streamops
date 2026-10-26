# API contracts

## Fetcher → Airtable webhook automation

`POST <AIRTABLE_WEBHOOK_URL>` with `Content-Type: application/json`. One request per stream, sent after the stream ends (and optionally once while live). Each accepted request costs one automation run.

```json
{
  "shared_token": "value of STREAMOPS_SHARED_TOKEN",
  "source_system": "Twitch API",
  "platform_stream_id": "4100000099",
  "title": "Stream title from Twitch",
  "status": "Completed",
  "started_at": "2026-10-26T16:00:00.000Z",
  "ended_at": "2026-10-26T18:00:00.000Z",
  "source_updated_at": "2026-10-26T18:01:00.000Z",
  "synced_at": "2026-10-26T18:05:00.000Z",
  "avg_viewers": 400,
  "peak_viewers": 610,
  "watch_hours_est": 800,
  "sample_count": 24
}
```

| Field | Rules |
|---|---|
| `shared_token` | Required. Automation ignores payloads where it doesn't match. |
| `platform_stream_id` | Required, numeric string. **Upsert key** → Streams.Platform Stream ID |
| `status` | `Live` or `Completed`. Completed requires `ended_at`. |
| timestamps | UTC ISO 8601 ending in `Z`. `ended_at ≥ started_at`. |
| metrics | Numbers or `null`. `null` means unknown and must stay blank in Airtable, never 0. |

Validation lives in `integrations/src/transforms/payload.ts` and runs before anything is sent.

### Automation mapping

| Payload | Streams field | Performance field |
|---|---|---|
| platform_stream_id | Platform Stream ID | (via Stream link) |
| title | Title (create only) | Metric Label |
| status | Status | — |
| started_at / ended_at | Started At / Ended At | — |
| source_system | Source System | Source |
| source_updated_at | Source Updated At | Source Updated At |
| synced_at | Last Synced At | Captured At, Last Synced At |
| avg_viewers, peak_viewers, watch_hours_est, sample_count | — | same names; Metric Basis = Estimated |

## Twitch Helix (used by the fetcher)

- `POST https://id.twitch.tv/oauth2/token` — client credentials → app access token (cached, refreshed 60s before expiry and once on 401).
- `GET https://api.twitch.tv/helix/streams?user_id=<broadcaster>` — returns a stream only while live, with `id`, `title`, `viewer_count`, `started_at`.

Rate limiting: 429 responses are retried with backoff honouring `Ratelimit-Reset`. Verify current limits and endpoint behaviour in the Twitch docs before relying on them.
