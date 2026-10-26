import { fetchWithRetry, HttpError } from "./http.js";

export interface LiveStream {
  id: string;
  title: string;
  viewerCount: number;
  startedAt: string;
}

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

/**
 * Minimal Twitch Helix client using an app access token (client credentials flow).
 * Get Streams only reports streams that are live right now, with a point-in-time viewer_count.
 * There is no historical average/peak or watch-hours endpoint, which is why we sample.
 */
export class TwitchClient {
  private token: TokenState | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
    });
    const res = await fetchWithRetry(
      "https://id.twitch.tv/oauth2/token",
      { method: "POST", body },
      { label: "twitch_token" },
    );
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return this.token.accessToken;
  }

  /** Returns the live stream for a broadcaster, or null when offline. Refreshes the token once on 401. */
  async getLiveStream(broadcasterId: string): Promise<LiveStream | null> {
    const url = `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(broadcasterId)}`;
    const call = async (force: boolean) =>
      fetchWithRetry(
        url,
        {
          headers: {
            "Client-Id": this.clientId,
            Authorization: `Bearer ${await this.getToken(force)}`,
          },
        },
        { label: "twitch_get_streams" },
      );

    let res: Response;
    try {
      res = await call(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) res = await call(true);
      else throw err;
    }

    const json = (await res.json()) as {
      data: Array<{ id: string; title: string; viewer_count: number; started_at: string }>;
    };
    const s = json.data[0];
    if (!s) return null;
    return { id: s.id, title: s.title, viewerCount: s.viewer_count, startedAt: s.started_at };
  }
}
