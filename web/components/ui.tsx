import type { ReactNode } from "react";

type Tone = "tally" | "cue" | "clear" | "signal" | "neutral";

const toneClass: Record<Tone, string> = {
  tally: "bg-tally/15 text-tally ring-tally/30",
  cue: "bg-cue/15 text-cue ring-cue/30",
  clear: "bg-clear/12 text-clear ring-clear/25",
  signal: "bg-signal/15 text-signal ring-signal/30",
  neutral: "bg-white/5 text-dim ring-white/10",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { tally: "bg-tally", cue: "bg-cue", clear: "bg-clear", signal: "bg-signal", neutral: "bg-faint" }[tone];
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${c}`} />;
}

/** Maps Airtable's computed status strings to a meaning. The strings come from formulas in the base. */
export function completenessTone(v: string): Tone {
  if (v === "Complete") return "clear";
  if (v === "Incomplete" || v === "Stale metrics") return "tally";
  return "cue";
}

export function freshnessTone(v: string): Tone {
  if (v === "Fresh") return "clear";
  if (v === "Stale" || v === "Never synced") return "tally";
  if (v === "N/A") return "neutral";
  return "cue";
}

export function severityTone(v: string): Tone {
  return v === "Critical" ? "tally" : v === "High" ? "cue" : v === "Medium" ? "signal" : "neutral";
}

export function syncTone(v: string): Tone {
  return v === "Succeeded" ? "clear" : v === "Failed" ? "tally" : v === "Partial" ? "cue" : "signal";
}

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-dim">{description}</p>
      </div>
      {children}
    </header>
  );
}

/** A single horizontal readout strip: one surface split into segments, like a meter bridge. */
export function Readouts({ items }: { items: { label: string; value: string; tone?: Tone; hint?: string }[] }) {
  const color = (t?: Tone) => (t === "tally" ? "text-tally" : t === "cue" ? "text-cue" : t === "clear" ? "text-clear" : "text-ink");
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-deck ring-1 ring-rule md:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`px-5 py-4 ${i % 2 === 1 ? "border-l border-rule" : ""} ${i >= 2 ? "border-t border-rule md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
        >
          <dt className="text-sm text-dim">{it.label}</dt>
          <dd className={`mt-1 font-display text-3xl font-semibold leading-none ${color(it.tone)}`}>{it.value}</dd>
          {it.hint ? <p className="mt-1.5 text-xs text-faint">{it.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Deterministic two-color "slate" for a stream, so cards have identity without stock photos. */
export function slateColors(seed: string): [string, string] {
  const palette: [string, string][] = [
    ["#3b2a6b", "#ff3b4e"],
    ["#1f3d5a", "#3ddc97"],
    ["#4a2747", "#ffb547"],
    ["#2b2f63", "#9b8cff"],
    ["#43301f", "#ff7a59"],
    ["#1e4247", "#5fd3f3"],
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length] ?? palette[0]!;
}

export function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
