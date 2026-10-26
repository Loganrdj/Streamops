import snapshot from "../data/snapshot.json";

/**
 * Data layer. Airtable is the system of record: every number shown here is computed by a
 * formula or rollup in the base. This file only reads and reshapes; it never recalculates
 * business logic (margin, completeness, freshness).
 *
 * Source: live Airtable REST API when AIRTABLE_TOKEN + AIRTABLE_BASE_ID are set, otherwise the
 * bundled demo snapshot. Live reads are cached (REVALIDATE_SECONDS, default 15 min) because the
 * Free plan's monthly API allowance is small: one refresh = 4 requests.
 */

type Fields = Record<string, unknown>;
type RawRecord = { id: string; fields: Fields };

export type Stream = {
  id: string;
  title: string;
  status: "Draft" | "Scheduled" | "Live" | "Completed" | "Cancelled";
  creator: string | null;
  platform: string | null;
  streamId: string;
  platformStreamId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  lastSyncedAt: string | null;
  cost: number | null;
  actualRevenue: number | null;
  invoicedRevenue: number | null;
  estimatedRevenue: number | null;
  contracted: number | null;
  margin: number | null;
  avgViewers: number | null;
  peakViewers: number | null;
  watchHours: number | null;
  openTasks: number;
  overdueTasks: number;
  openExceptions: number;
  freshness: string;
  missingFields: string | null;
  completeness: string;
};

export type Exception = {
  id: string;
  summary: string;
  type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "Investigating" | "Resolved" | "Won't Fix";
  detectedAt: string | null;
  streamIds: string[];
  notes: string | null;
};

export type SyncRun = {
  id: string;
  label: string;
  status: "Running" | "Succeeded" | "Partial" | "Failed";
  startedAt: string | null;
  processed: number | null;
  retry: string | null;
  error: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  brand: string;
  status: string;
  contractValue: number | null;
  allocated: number | null;
  received: number | null;
};

export type Dataset = {
  source: "airtable" | "snapshot";
  fetchedAt: string;
  streams: Stream[];
  exceptions: Exception[];
  syncRuns: SyncRun[];
  campaigns: Campaign[];
  error?: string;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const first = (v: unknown): string | null => (Array.isArray(v) && typeof v[0] === "string" ? v[0] : str(v));
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function toStream(r: RawRecord): Stream {
  const f = r.fields;
  return {
    id: r.id,
    title: str(f["Title"]) ?? "Untitled stream",
    status: (str(f["Status"]) ?? "Draft") as Stream["status"],
    creator: first(f["Creator Name"]),
    platform: str(f["Platform"]),
    streamId: str(f["Stream ID"]) ?? r.id,
    platformStreamId: str(f["Platform Stream ID"]),
    scheduledAt: str(f["Scheduled At"]),
    startedAt: str(f["Started At"]),
    endedAt: str(f["Ended At"]),
    lastSyncedAt: str(f["Last Synced At"]),
    cost: num(f["Stream Cost"]),
    actualRevenue: num(f["Actual Revenue"]),
    invoicedRevenue: num(f["Invoiced Revenue"]),
    estimatedRevenue: num(f["Estimated Revenue"]),
    contracted: num(f["Contracted Sponsorship"]),
    margin: num(f["Contribution Margin"]),
    avgViewers: num(f["Avg Viewers"]),
    peakViewers: num(f["Peak Viewers"]),
    watchHours: num(f["Watch Hours (Est.)"]),
    openTasks: num(f["Open Tasks"]) ?? 0,
    overdueTasks: num(f["Overdue Tasks"]) ?? 0,
    openExceptions: num(f["Open Exceptions"]) ?? 0,
    freshness: str(f["Sync Freshness"]) ?? "N/A",
    missingFields: str(f["Missing Fields"]),
    completeness: str(f["Data Completeness"]) ?? "Complete",
  };
}

const toException = (r: RawRecord): Exception => ({
  id: r.id,
  summary: str(r.fields["Summary"]) ?? "Untitled exception",
  type: str(r.fields["Type"]) ?? "Other",
  severity: (str(r.fields["Severity"]) ?? "Low") as Exception["severity"],
  status: (str(r.fields["Status"]) ?? "Open") as Exception["status"],
  detectedAt: str(r.fields["Detected At"]),
  streamIds: ids(r.fields["Stream"]),
  notes: str(r.fields["Resolution Notes"]),
});

const toSyncRun = (r: RawRecord): SyncRun => ({
  id: r.id,
  label: str(r.fields["Run Label"]) ?? "Sync run",
  status: (str(r.fields["Status"]) ?? "Running") as SyncRun["status"],
  startedAt: str(r.fields["Started At"]),
  processed: num(r.fields["Records Processed"]),
  retry: str(r.fields["Retry Outcome"]),
  error: str(r.fields["Error Message"]),
});

const toCampaign = (r: RawRecord): Campaign => ({
  id: r.id,
  name: str(r.fields["Campaign Name"]) ?? "Untitled campaign",
  brand: str(r.fields["Brand"]) ?? "",
  status: str(r.fields["Contract Status"]) ?? "Proposed",
  contractValue: num(r.fields["Contract Value"]),
  allocated: num(r.fields["Allocated to Streams"]),
  received: num(r.fields["Received to Date"]),
});

const FIELDS: Record<string, string[]> = {
  Streams: [
    "Title", "Status", "Creator Name", "Platform", "Stream ID", "Platform Stream ID", "Scheduled At",
    "Started At", "Ended At", "Last Synced At", "Stream Cost", "Actual Revenue", "Invoiced Revenue",
    "Estimated Revenue", "Contracted Sponsorship", "Contribution Margin", "Avg Viewers", "Peak Viewers",
    "Watch Hours (Est.)", "Open Tasks", "Overdue Tasks", "Open Exceptions", "Sync Freshness",
    "Missing Fields", "Data Completeness",
  ],
  Exceptions: ["Summary", "Type", "Severity", "Status", "Detected At", "Stream", "Resolution Notes"],
  "Sync Runs": ["Run Label", "Status", "Started At", "Records Processed", "Retry Outcome", "Error Message"],
  Campaigns: ["Campaign Name", "Brand", "Contract Status", "Contract Value", "Allocated to Streams", "Received to Date"],
};

async function fetchTable(baseId: string, token: string, table: string): Promise<RawRecord[]> {
  const revalidate = Number(process.env.REVALIDATE_SECONDS ?? 900);
  const out: RawRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    for (const f of FIELDS[table] ?? []) params.append("fields[]", f);
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate, tags: ["airtable"] } },
    );
    if (!res.ok) throw new Error(`Airtable returned ${res.status} for ${table}`);
    const json = (await res.json()) as { records: RawRecord[]; offset?: string };
    out.push(...json.records);
    offset = json.offset;
  } while (offset);
  return out;
}

function build(tables: Record<string, RawRecord[]>, source: Dataset["source"], fetchedAt: string, error?: string): Dataset {
  return {
    source,
    fetchedAt,
    error,
    streams: (tables["Streams"] ?? []).map(toStream),
    exceptions: (tables["Exceptions"] ?? []).map(toException),
    syncRuns: (tables["Sync Runs"] ?? []).map(toSyncRun),
    campaigns: (tables["Campaigns"] ?? []).map(toCampaign),
  };
}

export async function getData(): Promise<Dataset> {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const snap = snapshot as unknown as { capturedAt: string; tables: Record<string, RawRecord[]> };

  if (!token || !baseId) return build(snap.tables, "snapshot", snap.capturedAt);

  try {
    const names = Object.keys(FIELDS);
    const results = await Promise.all(names.map((n) => fetchTable(baseId, token, n)));
    return build(Object.fromEntries(names.map((n, i) => [n, results[i] ?? []])), "airtable", new Date().toISOString());
  } catch (err) {
    // Never show a blank screen: fall back to the snapshot and say so in the header.
    return build(snap.tables, "snapshot", snap.capturedAt, err instanceof Error ? err.message : String(err));
  }
}

export const airtableBaseUrl = () =>
  `https://airtable.com/${process.env.AIRTABLE_BASE_ID ?? "appk1TDkLadEimZ98"}`;
