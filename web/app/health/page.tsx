import { Dot, PageHeader, Pill, Readouts, Section, completenessTone, freshnessTone, severityTone, syncTone } from "@/components/ui";
import { getData } from "@/lib/data";
import { dayLabel, relative, time } from "@/lib/format";

const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export default async function HealthPage() {
  const data = await getData();
  const now = new Date();
  const streamTitle = new Map(data.streams.map((s) => [s.id, s.title]));

  const open = data.exceptions
    .filter((e) => e.status === "Open" || e.status === "Investigating")
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (b.detectedAt ?? "").localeCompare(a.detectedAt ?? ""));
  const resolved = data.exceptions.filter((e) => e.status === "Resolved" || e.status === "Won't Fix");

  const attention = data.streams.filter((s) => s.completeness !== "Complete" && s.status !== "Cancelled");
  const finished = data.syncRuns.filter((r) => r.status !== "Running");
  const ok = finished.filter((r) => r.status === "Succeeded").length;
  const lastGood = data.syncRuns
    .filter((r) => r.status === "Succeeded" && r.startedAt)
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0];

  const dupGroups = Object.values(
    data.streams.reduce<Record<string, typeof data.streams>>((acc, s) => {
      if (s.platformStreamId) (acc[s.platformStreamId] ??= []).push(s);
      return acc;
    }, {}),
  ).filter((g) => g.length > 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data health"
        description="Problems the base has detected, who should look at them, and how recent each sync is. Nothing here is hidden behind a zero."
      />

      <Readouts
        items={[
          { label: "Open issues", value: String(open.length), tone: open.some((e) => e.severity === "Critical") ? "tally" : open.length ? "cue" : "clear" },
          { label: "Streams not complete", value: String(attention.length), tone: attention.length ? "cue" : "clear", hint: "Missing data, metrics or costs" },
          { label: "Sync success", value: finished.length ? `${Math.round((ok / finished.length) * 100)}%` : "—", hint: `${ok} of ${finished.length} finished runs` },
          { label: "Last good sync", value: lastGood ? relative(lastGood.startedAt, now) : "Never", hint: lastGood?.label },
        ]}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Section title="Open issues">
          {open.length === 0 ? (
            <p className="rounded-2xl bg-deck p-5 text-dim ring-1 ring-rule">No open issues. New ones appear here as soon as they're logged in Airtable.</p>
          ) : (
            <ul className="space-y-3">
              {open.map((e) => (
                <li key={e.id} className="rounded-2xl bg-deck p-5 ring-1 ring-rule" style={{ boxShadow: e.severity === "Critical" ? "inset 3px 0 0 #ff3b4e" : undefined }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={severityTone(e.severity)}>{e.severity}</Pill>
                    <span className="text-sm text-dim">{e.type}</span>
                    <span className="ml-auto text-sm text-faint">
                      {e.status === "Investigating" ? "Being investigated, " : ""}opened {relative(e.detectedAt, now)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold leading-snug">{e.summary}</h3>
                  {e.streamIds.length ? (
                    <p className="mt-1 text-sm text-dim">Affects {e.streamIds.map((id) => streamTitle.get(id) ?? "an unknown stream").join(" and ")}</p>
                  ) : null}
                  {e.notes ? <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/85">{e.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
          {resolved.length ? (
            <p className="text-sm text-faint">{resolved.length} resolved issue{resolved.length > 1 ? "s" : ""} kept for the record in Airtable.</p>
          ) : null}
        </Section>

        <div className="space-y-8">
          <Section title="Streams that need attention">
            <ul className="divide-y divide-rule overflow-hidden rounded-2xl bg-deck ring-1 ring-rule">
              {attention.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-dim">
                      {s.missingFields ? `Missing ${s.missingFields.replace(/;$/, "").replace(/;/g, ",").toLowerCase()}` : `${s.status}, ${dayLabel(s.startedAt ?? s.scheduledAt)}`}
                    </p>
                  </div>
                  <Pill tone={completenessTone(s.completeness)}>{s.completeness}</Pill>
                </li>
              ))}
            </ul>
          </Section>

          {dupGroups.length ? (
            <Section title="Duplicate platform IDs">
              <ul className="space-y-2">
                {dupGroups.map((g) => (
                  <li key={g[0]!.platformStreamId} className="rounded-2xl bg-deck p-4 ring-1 ring-cue/40">
                    <p className="text-sm text-cue">Platform stream {g[0]!.platformStreamId} appears {g.length} times</p>
                    <p className="mt-1 text-sm text-dim">{g.map((s) => `${s.title} (${s.streamId})`).join(", ")}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Sync runs">
            <ol className="relative space-y-4 border-l border-rule pl-5">
              {[...data.syncRuns]
                .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))
                .map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5"><Dot tone={syncTone(r.status)} /></span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">{r.label}</p>
                      <p className="text-xs tabular-nums text-faint">
                        {dayLabel(r.startedAt)}, {time(r.startedAt)}
                      </p>
                    </div>
                    <p className="text-sm text-dim">
                      {r.status}
                      {r.retry && r.retry !== "Not retried" ? `, ${r.retry.toLowerCase()}` : ""}
                      {r.processed != null ? `, ${r.processed} record${r.processed === 1 ? "" : "s"}` : ""}
                    </p>
                    {r.error ? <p className="mt-1 max-w-prose text-sm text-ink/80">{r.error}</p> : null}
                  </li>
                ))}
            </ol>
          </Section>

          <Section title="Sync freshness">
            <ul className="flex flex-wrap gap-2">
              {data.streams
                .filter((s) => s.status === "Live" || s.status === "Completed")
                .map((s) => (
                  <li key={s.id}>
                    <Pill tone={freshnessTone(s.freshness)}>{s.title}: {s.freshness.toLowerCase()}</Pill>
                  </li>
                ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
