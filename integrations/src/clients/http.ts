import { log } from "../observability/log.js";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch with bounded retries. Retries network errors, 429 and 5xx with exponential backoff.
 * For 429, honours a Ratelimit-Reset header (epoch seconds) when present. Never retries other 4xx:
 * those mean the request itself is wrong (e.g. 401 expired credentials) and must surface as exceptions.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { attempts?: number; baseDelayMs?: number; label: string },
): Promise<Response> {
  const attempts = opts.attempts ?? 4;
  const base = opts.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) {
        throw new HttpError(res.status, `${opts.label} failed with HTTP ${res.status}`);
      }
      let delay = base * 2 ** (attempt - 1);
      const reset = Number(res.headers.get("ratelimit-reset"));
      if (res.status === 429 && Number.isFinite(reset) && reset > 0) {
        delay = Math.max(delay, reset * 1000 - Date.now());
      }
      lastError = new HttpError(res.status, `${opts.label} got HTTP ${res.status}`);
      log("warn", "http_retry", { label: opts.label, status: res.status, attempt, delayMs: delay });
      if (attempt < attempts) await sleep(delay);
    } catch (err) {
      if (err instanceof HttpError && err.status !== 429 && err.status < 500) throw err;
      lastError = err;
      const delay = base * 2 ** (attempt - 1);
      log("warn", "http_retry", { label: opts.label, error: String(err), attempt, delayMs: delay });
      if (attempt < attempts) await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${opts.label} failed`);
}
