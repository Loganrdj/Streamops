import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ViewerSample } from "../transforms/aggregate.js";

export interface StreamSession {
  platformStreamId: string;
  title: string;
  startedAt: string;
  samples: ViewerSample[];
}

/**
 * Local JSON file per live stream. This is the "event history" that would blow the Free plan's
 * 1,000-record limit if it lived in Airtable. Swap for SQLite/Postgres when it outgrows files.
 */
export class SampleStore {
  constructor(private readonly dir: string) {}

  private path(id: string) {
    return join(this.dir, `${id}.json`);
  }

  async load(id: string): Promise<StreamSession | null> {
    try {
      return JSON.parse(await readFile(this.path(id), "utf8")) as StreamSession;
    } catch {
      return null;
    }
  }

  async save(session: StreamSession): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(session.platformStreamId), JSON.stringify(session, null, 2));
  }

  /** Only called after Airtable accepted the final payload, so a failed send can be retried. */
  async archive(id: string): Promise<void> {
    await rm(this.path(id), { force: true });
  }

  async current(): Promise<string | null> {
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(this.dir)).filter((f) => f.endsWith(".json"));
      return files[0]?.replace(/\.json$/, "") ?? null;
    } catch {
      return null;
    }
  }
}
