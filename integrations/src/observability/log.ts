type Level = "debug" | "info" | "warn" | "error";

const SECRET_KEYS = /token|secret|authorization|password|webhook_?url/i;

/** Replace values of secret-looking keys so credentials never reach logs or Airtable. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEYS.test(k) ? "[redacted]" : redact(v),
      ]),
    );
  }
  return value;
}

/** One JSON object per line: easy to grep locally, easy to ship to a log service later. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redact(fields) as Record<string, unknown>),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}
