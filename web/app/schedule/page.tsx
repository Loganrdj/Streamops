import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Timecode } from "@/components/Timecode";
import { PageHeader, Pill } from "@/components/ui";
import { getData, type Stream } from "@/lib/data";
import { localDay, localMinutes, money, time, window } from "@/lib/format";

const FIRST_HOUR = 8;
const LAST_HOUR = 24;
const HOUR_PX = 56;

/** Monday (YYYY-MM-DD) of the week containing `day`. Pure calendar math on a date string. */
function mondayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

const labelFmt = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

const tone: Record<string, string> = {
  Live: "bg-tally/20 ring-tally/60 text-ink",
  Scheduled: "bg-signal/15 ring-signal/40 text-ink",
  Completed: "bg-white/[0.06] ring-white/10 text-dim",
  Cancelled: "bg-transparent ring-white/10 text-faint line-through",
};

export default async function SchedulePage({ searchParams }: { searchParams: { week?: string } }) {
  const data = await getData();
  const now = new Date();
  const today = localDay(now);
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week ?? "") ? searchParams.week! : today;
  const monday = mondayOf(requested);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const placed = data.streams
    .filter((s) => s.startedAt ?? s.scheduledAt)
    .map((s) => ({ s, ...window(s, now) }))
    .filter(({ start }) => days.includes(localDay(start)));

  const thisWeek = placed.filter(({ s }) => s.status !== "Cancelled");
  const contracted = thisWeek.reduce((a, { s }) => a + (s.contracted ?? 0), 0);
  const next = data.streams
    .filter((s) => s.status === "Scheduled" && s.scheduledAt && new Date(s.scheduledAt) > now)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))[0];
  const live = data.streams.find((s) => s.status === "Live");
  const unscheduled = data.streams.filter((s) => s.status === "Draft" || (!s.scheduledAt && !s.startedAt));

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const nowTop = (localMinutes(now) - FIRST_HOUR * 60) * (HOUR_PX / 60);
  const rangeLabel = `${labelFmt(days[0]!, { month: "short", day: "numeric" })} – ${labelFmt(days[6]!, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" description="Every stream in the base, placed on the week. Times are Pacific. Scheduled streams assume 2.5 hours until they end.">
        <div className="flex items-center gap-2">
          <Link href={`/schedule?week=${addDays(monday, -7)}`} aria-label="Previous week" className="grid h-9 w-9 place-items-center rounded-lg bg-deck ring-1 ring-rule hover:bg-panel">
            <ChevronLeft size={18} />
          </Link>
          <Link href="/schedule" className="rounded-lg bg-deck px-3 py-1.5 text-sm ring-1 ring-rule hover:bg-panel">
            This week
          </Link>
          <Link href={`/schedule?week=${addDays(monday, 7)}`} aria-label="Next week" className="grid h-9 w-9 place-items-center rounded-lg bg-deck ring-1 ring-rule hover:bg-panel">
            <ChevronRight size={18} />
          </Link>
          <span className="ml-2 font-display text-xl font-semibold tabular-nums">{rangeLabel}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-x-auto rounded-2xl bg-deck ring-1 ring-rule">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-rule">
              <div />
              {days.map((d) => {
                const isToday = d === today;
                return (
                  <div key={d} className="border-l border-rule px-3 py-3">
                    <p className={`text-sm ${isToday ? "text-signal" : "text-dim"}`}>{labelFmt(d, { weekday: "short" })}</p>
                    <p className={`font-display text-4xl font-semibold leading-none ${isToday ? "text-ink" : "text-dim"}`}>{labelFmt(d, { day: "numeric" })}</p>
                  </div>
                );
              })}
            </div>

            <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
              <div className="relative">
                {hours.map((h, i) => (
                  <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-faint" style={{ top: i * HOUR_PX }}>
                    {i === 0 ? "" : `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`}
                  </span>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={`relative border-l border-rule ${d === today ? "bg-signal/[0.04]" : ""}`}>
                  {hours.map((h, i) => (
                    <div key={h} className="absolute inset-x-0 border-t border-rule/50" style={{ top: i * HOUR_PX }} />
                  ))}
                  {placed
                    .filter(({ start }) => localDay(start) === d)
                    .map(({ s, start, end }) => {
                      const startMin = Math.max(localMinutes(start), FIRST_HOUR * 60);
                      const endMin = localDay(end) === d ? Math.min(localMinutes(end), LAST_HOUR * 60) : LAST_HOUR * 60;
                      const top = (startMin - FIRST_HOUR * 60) * (HOUR_PX / 60);
                      const height = Math.max((endMin - startMin) * (HOUR_PX / 60), 34);
                      return <Block key={s.id} s={s} top={top} height={height} start={start} end={end} />;
                    })}
                  {d === today && nowTop > 0 && nowTop < hours.length * HOUR_PX ? (
                    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                      <div className="h-0.5 bg-tally" />
                      <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-tally" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-deck p-5 ring-1 ring-rule">
            {live ? (
              <>
                <p className="flex items-center gap-2 text-sm text-tally"><span className="tally-pulse h-2 w-2 rounded-full bg-tally" />On air now</p>
                <p className="mt-1 font-display text-2xl font-semibold leading-tight">{live.title}</p>
                <Timecode from={live.startedAt ?? undefined} className="mt-2 block font-display text-4xl font-semibold tabular-nums" />
              </>
            ) : null}
            {next ? (
              <div className={live ? "mt-5 border-t border-rule pt-5" : ""}>
                <p className="text-sm text-dim">Next up</p>
                <p className="mt-1 font-display text-2xl font-semibold leading-tight">{next.title}</p>
                <p className="text-sm text-dim">{next.creator ?? "No creator assigned"}</p>
                <Timecode until={next.scheduledAt ?? undefined} className="mt-2 block font-display text-4xl font-semibold tabular-nums text-ink" />
                <p className="text-xs text-faint">until it starts</p>
              </div>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rule ring-1 ring-rule">
            <div className="bg-deck p-4">
              <dt className="text-sm text-dim">Streams this week</dt>
              <dd className="font-display text-3xl font-semibold">{thisWeek.length}</dd>
            </div>
            <div className="bg-deck p-4">
              <dt className="text-sm text-dim">Sponsorship booked</dt>
              <dd className="font-display text-3xl font-semibold">{money(contracted || null)}</dd>
            </div>
          </dl>

          <div className="rounded-2xl bg-deck p-5 ring-1 ring-rule">
            <h2 className="font-display text-xl font-semibold">Not on the calendar</h2>
            {unscheduled.length ? (
              <ul className="mt-2 space-y-2">
                {unscheduled.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{s.title}</span>
                    <Pill tone="cue">Needs a start time</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-dim">Every stream has a time.</p>
            )}
          </div>

          <ul className="flex flex-wrap gap-2 text-xs text-dim" aria-label="Legend">
            <li><Pill tone="tally">Live</Pill></li>
            <li><Pill tone="signal">Scheduled</Pill></li>
            <li><Pill>Completed</Pill></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Block({ s, top, height, start, end }: { s: Stream; top: number; height: number; start: Date; end: Date }) {
  const compact = height < 60;
  return (
    <div
      className={`absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1.5 ring-1 ring-inset ${tone[s.status] ?? tone.Completed}`}
      style={{ top, height }}
      title={`${s.title} · ${time(start.toISOString())}–${time(end.toISOString())}`}
    >
      <p className={`font-medium leading-tight ${compact ? "truncate text-xs" : "line-clamp-2 text-sm"}`}>{s.title}</p>
      {!compact ? (
        <p className="mt-0.5 truncate text-xs text-dim">
          {time(start.toISOString())}
          {s.creator ? `, ${s.creator.split(" ")[0]}` : ""}
        </p>
      ) : null}
      {!compact && (s.openExceptions > 0 || s.missingFields) ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-tally" aria-label="Has open issues" /> : null}
    </div>
  );
}
