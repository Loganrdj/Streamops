import Link from "next/link";
import { Slate } from "@/components/Slate";
import { Timecode } from "@/components/Timecode";
import { Dot, Pill, Readouts, Section, completenessTone, freshnessTone } from "@/components/ui";
import { getData, type Stream } from "@/lib/data";
import { count, dayLabel, localDay, money, relative, time, window } from "@/lib/format";

function startOf(s: Stream) {
  return s.startedAt ?? s.scheduledAt;
}

function groupUpcoming(streams: Stream[], now: Date) {
  const today = localDay(now);
  const tomorrow = localDay(new Date(now.getTime() + 86_400_000));
  const weekEnd = now.getTime() + 7 * 86_400_000;
  const groups: Record<string, Stream[]> = { Today: [], Tomorrow: [], "Next 7 days": [], Later: [] };
  for (const s of streams) {
    const at = startOf(s);
    if (!at) continue;
    const d = new Date(at);
    const day = localDay(d);
    if (day === today) groups["Today"]!.push(s);
    else if (day === tomorrow) groups["Tomorrow"]!.push(s);
    else if (d.getTime() < weekEnd) groups["Next 7 days"]!.push(s);
    else groups["Later"]!.push(s);
  }
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

export default async function ControlRoom() {
  const data = await getData();
  const now = new Date();
  const byStart = (a: Stream, b: Stream) => (startOf(a) ?? "").localeCompare(startOf(b) ?? "");

  const live = data.streams.filter((s) => s.status === "Live").sort(byStart);
  const upcoming = data.streams.filter((s) => s.status === "Scheduled" && startOf(s)).sort(byStart);
  const onAir = live[0] ?? null;
  const next = upcoming[0] ?? null;
  const featured = onAir ?? next;

  const month = localDay(now).slice(0, 7);
  const completedThisMonth = data.streams.filter((s) => s.status === "Completed" && (startOf(s) ?? "").length && localDay(new Date(startOf(s)!)).startsWith(month));
  const withViewers = completedThisMonth.filter((s) => s.avgViewers != null);
  const avgViewers = withViewers.length ? withViewers.reduce((a, s) => a + (s.avgViewers ?? 0), 0) / withViewers.length : null;
  const revenueKnown = completedThisMonth.filter((s) => s.actualRevenue != null);
  const revenue = revenueKnown.length ? revenueKnown.reduce((a, s) => a + (s.actualRevenue ?? 0), 0) : null;
  const openExceptions = data.exceptions.filter((e) => e.status === "Open" || e.status === "Investigating");
  const critical = openExceptions.filter((e) => e.severity === "Critical").length;

  const log = data.streams
    .filter((s) => s.status === "Completed" || s.status === "Live")
    .sort((a, b) => byStart(b, a))
    .slice(0, 8);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-8">
        {featured ? <ProgramMonitor stream={featured} onAir={Boolean(onAir)} /> : <EmptyMonitor />}

        <Readouts
          items={[
            { label: "Streams this month", value: count(completedThisMonth.length), hint: "Completed so far" },
            { label: "Average viewers", value: count(avgViewers), hint: `Across ${withViewers.length} streams with metrics` },
            { label: "Revenue received", value: money(revenue), tone: "clear", hint: "Received only, no estimates" },
            {
              label: "Open issues",
              value: count(openExceptions.length),
              tone: critical ? "tally" : openExceptions.length ? "cue" : "clear",
              hint: critical ? `${critical} critical` : "None critical",
            },
          ]}
        />

        <Section
          title="Recent streams"
          aside={
            <Link href="/health" className="text-sm text-signal hover:underline">
              Check data health
            </Link>
          }
        >
          <div className="overflow-hidden rounded-2xl bg-deck ring-1 ring-rule">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Most recent live and completed streams</caption>
              <thead className="text-xs text-faint">
                <tr className="border-b border-rule">
                  <th scope="col" className="px-4 py-3 font-medium">Stream</th>
                  <th scope="col" className="hidden px-3 py-3 text-right font-medium md:table-cell">Avg / peak viewers</th>
                  <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">Last sync</th>
                  <th scope="col" className="px-3 py-3 font-medium">Data</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell">Margin</th>
                </tr>
              </thead>
              <tbody>
                {log.map((s) => (
                  <tr key={s.id} className="border-b border-rule/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Slate seed={s.title} creator={s.creator} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {s.title}
                            {s.status === "Live" ? <span className="ml-2 align-middle"><Pill tone="tally">Live</Pill></span> : null}
                          </p>
                          <p className="truncate text-xs text-dim">
                            {s.creator ?? "No creator"}, {dayLabel(startOf(s))}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-dim md:table-cell">
                      <span className="text-ink">{count(s.avgViewers)}</span> / {count(s.peakViewers)}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="inline-flex items-center gap-2 text-dim">
                        <Dot tone={freshnessTone(s.freshness)} />
                        {s.freshness === "Never synced" ? "Never synced" : relative(s.lastSyncedAt, now)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={completenessTone(s.completeness)}>{s.completeness}</Pill>
                    </td>
                    <td className={`hidden px-4 py-3 text-right tabular-nums sm:table-cell ${s.margin == null ? "text-faint" : s.margin < 0 ? "text-tally" : "text-ink"}`}>
                      {money(s.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <aside className="space-y-4" aria-labelledby="rundown-title">
        <div className="flex items-baseline justify-between">
          <h2 id="rundown-title" className="font-display text-2xl font-semibold">Rundown</h2>
          <Link href="/schedule" className="text-sm text-signal hover:underline">
            Open schedule
          </Link>
        </div>
        {groupUpcoming([...live, ...upcoming], now).map(([label, list]) => (
          <section key={label} className="space-y-2">
            <h3 className="text-sm font-medium text-dim">{label}</h3>
            {list.map((s) => (
              <RundownItem key={s.id} s={s} now={now} />
            ))}
          </section>
        ))}
        {upcoming.length === 0 && live.length === 0 ? (
          <p className="rounded-2xl bg-deck p-5 text-dim ring-1 ring-rule">
            Nothing scheduled. Add a stream in Airtable and set its status to Scheduled.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function ProgramMonitor({ stream: s, onAir }: { stream: Stream; onAir: boolean }) {
  const { start, end } = window(s);
  return (
    <section aria-label={onAir ? "On air now" : "Up next"} className="grid gap-6 rounded-[22px] bg-deck p-3 ring-1 ring-rule lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:p-4">
      <div className="relative">
        <Slate seed={s.title} creator={s.creator} size="lg" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-console/80 px-2.5 py-1 backdrop-blur">
          <span className={`h-2.5 w-2.5 rounded-full ${onAir ? "tally-pulse bg-tally" : "bg-faint"}`} />
          <span className={`font-display text-sm font-semibold tracking-wider ${onAir ? "text-tally" : "text-dim"}`}>
            {onAir ? "ON AIR" : "STANDBY"}
          </span>
        </div>
        <div className="absolute bottom-4 right-4 rounded-md bg-console/80 px-3 py-1.5 text-right backdrop-blur">
          <p className="text-[11px] text-dim">{onAir ? "Time on air" : "Starts in"}</p>
          <Timecode
            from={onAir ? (s.startedAt ?? undefined) : undefined}
            until={onAir ? undefined : (s.scheduledAt ?? undefined)}
            className="font-display text-2xl font-semibold tabular-nums tracking-wide text-ink"
          />
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 px-2 pb-2 lg:py-3 lg:pr-3">
        <div>
          <p className="text-sm text-dim">{onAir ? "Live now" : "Up next"}</p>
          <h2 className="mt-1 font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">{s.title}</h2>
          <p className="mt-2 text-dim">
            {s.creator ?? "No creator assigned"} on {s.platform ?? "an unknown platform"}, {dayLabel(start.toISOString())}{" "}
            {time(start.toISOString())}
            {onAir ? "" : `–${time(end.toISOString())}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.contracted ? <Pill tone="signal">{money(s.contracted)} sponsorship</Pill> : null}
            {s.openTasks ? <Pill tone={s.overdueTasks ? "cue" : "neutral"}>{s.openTasks} open {s.openTasks === 1 ? "task" : "tasks"}{s.overdueTasks ? `, ${s.overdueTasks} overdue` : ""}</Pill> : <Pill tone="clear">Checklist done</Pill>}
            {s.openExceptions ? <Pill tone="tally">{s.openExceptions} open issue{s.openExceptions > 1 ? "s" : ""}</Pill> : null}
          </div>
        </div>

        {onAir ? (
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-rule ring-1 ring-rule">
            {[
              ["Avg viewers", count(s.avgViewers)],
              ["Peak", count(s.peakViewers)],
              ["Last sync", relative(s.lastSyncedAt)],
            ].map(([k, v]) => (
              <div key={k} className="bg-panel px-3 py-3">
                <dt className="text-xs text-dim">{k}</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold leading-tight">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-dim">The checklist and sponsor deliverables for this stream live in Airtable.</p>
        )}
      </div>
    </section>
  );
}

function EmptyMonitor() {
  return (
    <section className="grid aspect-[21/9] place-items-center rounded-[22px] bg-deck p-8 text-center ring-1 ring-rule">
      <div>
        <p className="font-display text-3xl font-semibold">Nothing on air or scheduled</p>
        <p className="mt-2 text-dim">Schedule a stream in Airtable and it will appear here.</p>
      </div>
    </section>
  );
}

function RundownItem({ s, now }: { s: Stream; now: Date }) {
  const { start, end } = window(s, now);
  const live = s.status === "Live";
  return (
    <article className={`rounded-xl bg-deck p-4 ring-1 ${live ? "ring-tally/40" : "ring-rule"}`}>
      <p className={`text-sm tabular-nums ${live ? "text-tally" : "text-dim"}`}>
        {live ? "Live since " + time(s.startedAt) : `${dayLabel(start.toISOString())}, ${time(start.toISOString())}–${time(end.toISOString())}`}
      </p>
      <h4 className="mt-1 font-display text-xl font-semibold leading-tight">{s.title}</h4>
      <p className="text-sm text-dim">{s.creator ?? "No creator assigned"}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.missingFields ? <Pill tone="tally">Missing: {s.missingFields.replace(/;$/, "").replace(/;/g, ",")}</Pill> : null}
        {s.overdueTasks ? <Pill tone="cue">{s.overdueTasks} overdue</Pill> : null}
        {s.openTasks && !s.overdueTasks ? <Pill>{s.openTasks} {s.openTasks === 1 ? "task" : "tasks"} to do</Pill> : null}
        {s.contracted ? <Pill tone="signal">{money(s.contracted)}</Pill> : null}
      </div>
    </article>
  );
}
