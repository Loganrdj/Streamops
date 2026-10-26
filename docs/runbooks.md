# Runbooks

## Automation run budget (Free: 100/month, resets on the 1st)

| Automation | Runs |
|---|---|
| Generate production checklist | 1 per newly scheduled stream |
| Ingest Twitch sync payload | 1 per payload (target: 1 per stream) |
| Testing | Budget ~20; test at the start of the month |

Failed runs count too. Check usage in the automations panel before demos.

## Turn on the checklist automation

1. Open the base → Automations → *Generate production checklist when a stream is scheduled*.
2. Review the trigger: Status = Scheduled, Creator not empty, Scheduled At not empty, Production Tasks empty. The last condition stops duplicate checklists if a stream flips status.
3. Turn it on. Existing records don't trigger; only streams that newly match do.
4. Test: create a stream, add creator and start time, set Status = Scheduled. Five tasks should appear with `Effective Due` dates.

## Finish the webhook ingest automation

The automation exists as a draft with only a logging step. Airtable needs one real sample payload before its steps can reference payload fields.

1. Copy `integrations/.env.example` to `integrations/.env`. Set `AIRTABLE_WEBHOOK_URL` (from the automation's trigger panel) and a random `STREAMOPS_SHARED_TOKEN`.
2. With the automation **off**, send the sample: `cd integrations && npm run send-sample` (or `scripts/send-sample.sh`). While off, Airtable only stores the sample.
3. In the trigger panel, click *Test trigger* to capture the schema.
4. Build these steps (all no-code, available on Free):
   1. **Condition**: continue only if `body.shared_token` equals your token.
   2. **Find records** in Streams where Platform Stream ID = `body.platform_stream_id`.
   3. **Conditional group**:
      - *If records found*: Update record (first found) → Status, Started At, Ended At, Source System, Source Updated At, Last Synced At.
      - *Else*: Create record in Streams with Title and the same fields. Then create an Exception (Type: Missing Required Field, "Stream created by sync; needs creator").
   4. **Create record** in Performance linked to the stream, with the metrics and Metric Basis = Estimated.
   5. **Update** the logging Sync Run to Succeeded with Records Processed.
5. Replay the same sample twice and confirm only one Stream exists (demo scenario 2).

## Resolve a duplicate stream

1. Data Health → *Duplicate platform IDs*: a group with 2+ rows.
2. Keep the record with the most links (tasks, finance). Move any links from the duplicate.
3. Delete the duplicate. Set the Exception to Resolved with notes.
4. Root cause is almost always an insert instead of an upsert; check the ingest automation's Find step.

## Expired or invalid Twitch credentials (401 after token refresh)

1. Twitch dev console → your app → generate a new client secret.
2. Update `TWITCH_CLIENT_SECRET` in `.env` only. Never paste it into Airtable.
3. Restart the poller. For a stream that already ended, re-send its payload from the session file in `data/samples` (kept until a send succeeds).
4. Resolve the Exception with what happened.

## Stale metrics

1. Data Health shows `Stale metrics`: the last sync happened before the stream ended.
2. If the session file still exists, re-send. Otherwise, mark the Performance row's basis as Estimated and resolve with notes; don't present it as final.

## Unmatched financial record

1. Data Health → *Unmatched financial records*.
2. `Unmatched - needs exception`: create an Exception (Type: Unmatched Financial Record) linked to the revenue row.
3. Confirm the correct stream with whoever owns the money. Never guess. Link it, then resolve the Exception.

## Monthly housekeeping (record budget)

- Count records per table. Stay under ~800 to keep headroom.
- Delete Succeeded Sync Runs older than 60 days after noting totals in a summary row.
