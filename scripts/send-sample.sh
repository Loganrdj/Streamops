#!/usr/bin/env bash
# Sends one synthetic payload so the Airtable webhook automation can capture its schema.
# Run with the automation OFF. Usage:
#   AIRTABLE_WEBHOOK_URL=... STREAMOPS_SHARED_TOKEN=... ./scripts/send-sample.sh
set -euo pipefail
: "${AIRTABLE_WEBHOOK_URL:?Set AIRTABLE_WEBHOOK_URL}"
: "${STREAMOPS_SHARED_TOKEN:?Set STREAMOPS_SHARED_TOKEN}"

curl -sS -X POST "$AIRTABLE_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d @- <<JSON
{
  "shared_token": "${STREAMOPS_SHARED_TOKEN}",
  "source_system": "Twitch API",
  "platform_stream_id": "4100000099",
  "title": "Sample stream (schema capture)",
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
JSON
echo
