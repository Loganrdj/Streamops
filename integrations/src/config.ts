export interface Config {
  twitchClientId: string;
  twitchClientSecret: string;
  broadcasterId: string;
  airtableWebhookUrl: string;
  sharedToken: string;
  pollIntervalSeconds: number;
  samplesDir: string;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const interval = Number(env.POLL_INTERVAL_SECONDS ?? 300);
  if (!Number.isFinite(interval) || interval < 30) {
    throw new Error("POLL_INTERVAL_SECONDS must be a number >= 30");
  }
  return {
    twitchClientId: required(env, "TWITCH_CLIENT_ID"),
    twitchClientSecret: required(env, "TWITCH_CLIENT_SECRET"),
    broadcasterId: required(env, "TWITCH_BROADCASTER_ID"),
    airtableWebhookUrl: required(env, "AIRTABLE_WEBHOOK_URL"),
    sharedToken: required(env, "STREAMOPS_SHARED_TOKEN"),
    pollIntervalSeconds: interval,
    samplesDir: env.SAMPLES_DIR?.trim() || "./data/samples",
  };
}
