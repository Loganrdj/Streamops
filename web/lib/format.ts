export const TZ = process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE ?? "America/Los_Angeles";

const money0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Unknown stays visibly unknown: an em dash, never $0. */
export const money = (v: number | null | undefined) => (v == null ? "—" : money0.format(v));
export const count = (v: number | null | undefined) => (v == null ? "—" : int.format(v));

export const time = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "—";

export const dayLabel = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso))
    : "Not scheduled";

export const shortDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(new Date(iso)) : "—";

/** YYYY-MM-DD of an instant in the display time zone. */
export const localDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Minutes after local midnight in the display time zone. */
export function localMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function relative(iso: string | null, now = new Date()): string {
  if (!iso) return "never";
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  const abs = Math.abs(diff);
  const unit = abs < 3600 ? [Math.round(abs / 60), "min"] : abs < 86400 ? [Math.round(abs / 3600), "h"] : [Math.round(abs / 86400), "d"];
  return diff >= 0 ? `${unit[0]} ${unit[1]} ago` : `in ${unit[0]} ${unit[1]}`;
}

export const DEFAULT_DURATION_MIN = 150;

/** Planned or actual window of a stream. Scheduled streams assume a default length. */
export function window(s: { scheduledAt: string | null; startedAt: string | null; endedAt: string | null; status: string }, now = new Date()) {
  const start = new Date(s.startedAt ?? s.scheduledAt ?? now.toISOString());
  const end = s.endedAt
    ? new Date(s.endedAt)
    : s.status === "Live"
      ? new Date(Math.max(now.getTime(), start.getTime() + 30 * 60_000))
      : new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  return { start, end };
}
