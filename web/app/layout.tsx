import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { airtableBaseUrl, getData } from "@/lib/data";
import { relative } from "@/lib/format";

export const metadata: Metadata = {
  title: "StreamOps",
  description: "Livestream production control room backed by Airtable.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const data = await getData();
  const openAlerts = data.exceptions.filter((e) => e.status === "Open" || e.status === "Investigating").length;

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Nav alerts={openAlerts} />
        <div className="md:pl-24">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-rule bg-console/90 px-4 py-3 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-tally/15 ring-1 ring-tally/40">
                <span className="h-2.5 w-2.5 rounded-full bg-tally" />
              </span>
              <span className="font-display text-xl font-semibold tracking-wide">StreamOps</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className="hidden text-dim sm:inline"
                title={data.error ? `Live data unavailable: ${data.error}` : undefined}
              >
                {data.source === "airtable"
                  ? `Live from Airtable, refreshed ${relative(data.fetchedAt)}`
                  : data.error
                    ? "Couldn't reach Airtable, showing the demo snapshot"
                    : "Demo snapshot"}
              </span>
              <a
                href={airtableBaseUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 font-medium text-console hover:bg-signal/90"
              >
                Edit in Airtable <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </header>
          <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-8 md:pb-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
