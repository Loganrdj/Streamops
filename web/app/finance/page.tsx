import { PageHeader, Pill, Readouts, Section, completenessTone } from "@/components/ui";
import { getData } from "@/lib/data";
import { dayLabel, money } from "@/lib/format";

const sum = (xs: (number | null)[]) => {
  const known = xs.filter((x): x is number => x != null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
};

export default async function FinancePage() {
  const data = await getData();
  const done = data.streams
    .filter((s) => s.status === "Completed" || s.status === "Live")
    .sort((a, b) => (b.startedAt ?? b.scheduledAt ?? "").localeCompare(a.startedAt ?? a.scheduledAt ?? ""));

  const actual = sum(done.map((s) => s.actualRevenue));
  const invoiced = sum(done.map((s) => s.invoicedRevenue));
  const estimated = sum(done.map((s) => s.estimatedRevenue));
  const cost = sum(done.map((s) => s.cost));
  const margin = sum(done.map((s) => s.margin));
  const unknownMargin = done.filter((s) => s.margin == null).length;

  const campaigns = [...data.campaigns].sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0));
  const maxContract = Math.max(...campaigns.map((c) => c.contractValue ?? 0), 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance"
        description="Money received, money billed and money estimated are kept apart. A dash means the number isn't known yet, not that it's zero."
      />

      <Readouts
        items={[
          { label: "Received", value: money(actual), tone: "clear", hint: "Actual revenue" },
          { label: "Invoiced, not paid", value: money(invoiced), hint: "Billed sponsors" },
          { label: "Approved costs", value: money(cost) },
          {
            label: "Contribution margin",
            value: money(margin),
            tone: margin != null && margin < 0 ? "tally" : undefined,
            hint: unknownMargin ? `${unknownMargin} streams left out until both sides are known` : undefined,
          },
        ]}
      />
      <p className="-mt-4 text-sm text-faint">Estimated revenue of {money(estimated)} is tracked separately and never added to the totals above.</p>

      <Section title="Sponsorship campaigns">
        <ul className="grid gap-3 md:grid-cols-2">
          {campaigns.map((c) => {
            const contract = c.contractValue ?? 0;
            const width = (v: number | null) => `${Math.min(100, ((v ?? 0) / maxContract) * 100)}%`;
            return (
              <li key={c.id} className="rounded-2xl bg-deck p-5 ring-1 ring-rule">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold leading-tight">{c.name}</h3>
                    <p className="text-sm text-dim">{c.brand}</p>
                  </div>
                  <Pill tone={c.status === "Active" ? "clear" : c.status === "Signed" ? "signal" : c.status === "Cancelled" ? "tally" : "neutral"}>{c.status}</Pill>
                </div>
                <div className="mt-4 space-y-2" aria-hidden>
                  <div className="relative h-2.5 rounded-full bg-white/5">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: width(contract) }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-signal/60" style={{ width: width(c.allocated) }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-clear" style={{ width: width(c.received) }} />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-faint">Contract</dt><dd className="tabular-nums">{money(c.contractValue)}</dd></div>
                  <div><dt className="text-signal">Booked on streams</dt><dd className="tabular-nums">{money(c.allocated)}</dd></div>
                  <div><dt className="text-clear">Received</dt><dd className="tabular-nums">{money(c.received)}</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Stream profit and loss">
        <div className="overflow-x-auto rounded-2xl bg-deck ring-1 ring-rule">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Revenue, cost and margin per stream</caption>
            <thead className="text-xs text-faint">
              <tr className="border-b border-rule">
                <th scope="col" className="px-5 py-3 font-medium">Stream</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Received</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Invoiced</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Estimated</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Cost</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Margin</th>
                <th scope="col" className="px-5 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {done.map((s) => (
                <tr key={s.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-dim">{s.creator ?? "No creator"}, {dayLabel(s.startedAt ?? s.scheduledAt)}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(s.actualRevenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-dim">{money(s.invoicedRevenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums italic text-faint">{money(s.estimatedRevenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(s.cost)}</td>
                  <td className={`px-3 py-3 text-right font-medium tabular-nums ${s.margin == null ? "text-faint" : s.margin < 0 ? "text-tally" : "text-clear"}`}>{money(s.margin)}</td>
                  <td className="px-5 py-3">
                    {s.status === "Live" ? <Pill tone="tally">Live, not final</Pill> : <Pill tone={completenessTone(s.completeness)}>{s.completeness}</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
