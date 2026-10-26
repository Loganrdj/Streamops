# Architecture decisions

Short ADRs. Each records the decision, why, and what it costs.

## ADR-001 — Airtable first, code only at the edges

**Decision:** Schema, business logic, monitoring and workflows live in Airtable. Code only fetches from Twitch and holds samples and secrets.
**Why:** The project's goal is Airtable depth, and the README's own principle is to avoid unnecessary infrastructure.
**Cost:** Some logic is more verbose in formulas than in code; we accept that for visibility to non-engineers.

## ADR-002 — Design for the Free plan

**Decision:** Treat 1,000 records/base, 100 automation runs/month, no script actions and no extensions as hard constraints.
**Why:** It's the plan in use, and the constraints force good habits (event-driven automations, lean data).
**Cost:** No scripted upsert or scripted duplicate detection. See ADR-005 and ADR-007.

## ADR-003 — Stable IDs from `RECORD_ID()` formulas

**Decision:** `<Table> ID = "<PREFIX>-" & RECORD_ID()`.
**Alternatives:** Autonumber (changes on table duplication/import); automation that copies the ID into text (costs a run per record).
**Why:** Record IDs are immutable for a record's lifetime and the formula costs nothing.
**Cost:** A delete-and-recreate yields a new ID. We treat that as a new entity, which is the honest outcome.

## ADR-004 — Viewer samples live outside Airtable

**Decision:** The fetcher polls Twitch every 5 minutes into local JSON and writes one Performance record per stream.
**Why:** Twitch Get Streams only returns a live `viewer_count`; there's no historical average/peak/watch-hours endpoint. Storing samples in Airtable (~36 per 3-hour stream) would consume the record limit in weeks.
**Cost:** Watch hours are estimates; their accuracy depends on poll frequency. Labeled `Estimated`.

## ADR-005 — No-code upsert through the webhook trigger

**Decision:** The fetcher POSTs one payload per stream to a "When webhook received" automation, which finds the Stream by Platform Stream ID and updates or creates it, then logs a Sync Run.
**Why:** "Run a script" is unavailable on Free; the webhook trigger is available on all plans. Secrets stay in the fetcher.
**Cost:** Each payload is one run. There's no signature verification, so a shared token in the payload is checked by a condition, and the URL is treated as a secret. The Web API's `performUpsert` is the alternative when API calls are cheaper than runs.

## ADR-006 — Unknown is blank, never zero

**Decision:** Every financial and performance rollup returns BLANK when it has no inputs; margin is blank if either side is unknown.
**Why:** A $0 cost on a stream with no expenses entered looks like pure profit. Blank plus a `Data Completeness` reason is honest.

## ADR-007 — Monitoring by formulas and views, not scheduled automations

**Decision:** Missing fields, staleness, overdue tasks and quarantine status are formulas surfaced in the Data Health interface. Duplicates are visible by grouping on Platform Stream ID.
**Why:** A daily scheduled check alone would use ~30 of 100 monthly runs.
**Cost:** `NOW()` refreshes periodically, not instantly. Duplicate *prevention* depends on the upsert; duplicate *detection* is visual.

## ADR-008 — Separate actual, invoiced, estimated and contracted money

**Decision:** Four distinct measures, never summed together. Only `Received` revenue is actual.
**Why:** Directly from the README's financial pillar; the sample data shows a stream whose margin is negative because its sponsorship is still only invoiced.

## ADR-009 — Task due dates are formulas, not stored values

**Decision:** The checklist automation stores `Hours Before Stream`; `Effective Due` computes the date from the stream's current start time. `Due At` remains as a manual override.
**Why:** Airtable automations can't do date arithmetic without scripts, and this way rescheduling a stream moves its checklist automatically.

## ADR-010 — Status-aware staleness

**Decision:** Live streams are stale after 60 minutes without a sync; completed streams are stale if their last sync happened before they ended.
**Why:** A simple "older than 24h" rule would mark every past stream stale and drown the real problem (a sync that missed the final numbers).
