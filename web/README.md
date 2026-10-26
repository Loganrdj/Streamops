# StreamOps web dashboard

A dark, control-room style front end for the StreamOps Airtable base. Airtable stays the database and the place where data is edited; this app reads it and presents it.

| Page | What it shows |
|---|---|
| **Control room** (`/`) | The stream on air now (or next up) with a running clock, this month's readouts, recent streams with sync and data status, and the rundown of what's coming |
| **Schedule** (`/schedule`) | Week calendar of every stream in Pacific time, a live "now" line, the next stream's countdown, and streams that have no start time |
| **Data health** (`/health`) | Open issues by severity, streams that aren't complete and why, duplicate platform IDs, and the sync run history |
| **Finance** (`/finance`) | Received, invoiced and estimated money kept apart, campaign progress, and profit and loss per stream (a dash means unknown, never $0) |

## Run it

Needs Node 18.17 or newer.

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. With no configuration it runs on the bundled demo snapshot (`data/snapshot.json`), which mirrors the synthetic data in the base.

## Connect it to your live base

1. Create a personal access token at https://airtable.com/create/tokens with scope **data.records:read** and access to the **StreamOps** base only.
2. Copy `.env.example` to `.env.local` and set `AIRTABLE_TOKEN`. The base ID is already filled in.
3. Restart `npm run dev`. The header changes from "Demo snapshot" to "Live from Airtable".

If Airtable can't be reached (bad token, rate limit), the app falls back to the snapshot and says so in the header instead of showing a blank page.

## Free plan API budget

Each data refresh reads 4 tables = 4 API requests, and results are cached for `REVALIDATE_SECONDS` (default 15 minutes). Light daily use stays well inside the Free plan's monthly allowance. Lower the cache time only if you need fresher data and have API calls to spare.

## Design notes

- **Airtable computes, the app displays.** Margin, completeness, staleness and rollups come from formulas in the base. The app never recalculates business logic, so the two can't disagree.
- **Broadcast vernacular for color.** Red means on air or critical, amber means needs attention, green means healthy, violet means interactive or booked.
- **No stock imagery.** Each stream gets a generated slate (creator monogram on a two-tone field), so cards have identity without photos.
- Fonts (Barlow, Barlow Condensed) are bundled through Fontsource, so nothing loads from a third-party CDN.

## Stack

Next.js 14 (App Router, server components), TypeScript, Tailwind CSS, lucide-react icons.
