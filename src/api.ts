export interface AnilistTitle {
  native?: string | null;
  romaji?: string | null;
  english?: string | null;
  chinese?: string | null;
}

export interface AnilistData {
  id: number;
  idMal?: number | null;
  title: AnilistTitle;
  synonyms?: string[];
  synonyms_chinese?: string[];
  isAdult?: boolean;
  episodes?: number | null;
}

export interface SearchResultItem {
  anilist: number | AnilistData;
  filename: string;
  episode?: number | string | (number | string)[] | null;
  episode_start?: number | null;
  episode_end?: number | null;
  from: number;
  to: number;
  similarity: number;
  video: string;
  image: string;
}

export interface SearchResponse {
  frameCount: number;
  error?: string;
  result: SearchResultItem[];
  quota?: number;
  quotaUsed?: number;
}

export interface UserResponse {
  id: string;
  priority: number;
  concurrency: number;
  quota: number;
  quotaUsed: number;
}

export interface AnilistSearchResultItem {
  id: number;
  title: string;
  similarity: number;
  anilist: AnilistData;
}

export class TraceMoeClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.TRACE_MOE_API_HOST ||
      "https://api.trace.moe"
    ).replace(/\/$/, "");

    this.apiKey = options?.apiKey || process.env.TRACE_MOE_API_KEY || "";
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "trace.moe-mcp/1.0.0",
    };
    if (this.apiKey) {
      headers["x-trace-key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Search anime scene by sending a 33-element MPEG-7 Color Layout Descriptor vector.
   */
  async searchByVector(
    vector: number[],
    options?: {
      anilistInfo?: boolean;
      anilistID?: number;
    },
  ): Promise<SearchResponse> {
    if (!Array.isArray(vector) || vector.length !== 33) {
      throw new Error(
        `Invalid feature vector: expected 33 numbers, got ${Array.isArray(vector) ? vector.length : typeof vector}`,
      );
    }

    const queryParams = new URLSearchParams();
    if (options?.anilistInfo !== false) {
      queryParams.set("anilistInfo", "2");
    }
    if (options?.anilistID !== undefined) {
      queryParams.set("anilistID", String(options.anilistID));
    }

    const qs = queryParams.toString();
    const url = `${this.baseUrl}/search${qs ? `?${qs}` : ""}`;

    const headers = {
      ...this.getHeaders(),
      "Content-Type": "application/json",
    };

    let response: Response | undefined;
    let retries = 3;

    while (retries > 0) {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ vector }),
      });

      if (response.status !== 503 || retries === 1) {
        break;
      }

      retries--;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (!response) {
      throw new Error("No response received from trace.moe API");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let parsedError = errorText;
      try {
        const json = JSON.parse(errorText);
        if (json.error) parsedError = json.error;
      } catch {}

      if (response.status === 402) {
        throw new Error(`trace.moe search quota exceeded. ${parsedError}`);
      }
      if (response.status === 429) {
        throw new Error(`trace.moe rate limit exceeded. Please try again later. ${parsedError}`);
      }
      if (response.status === 503) {
        throw new Error(`trace.moe server is currently busy or overloaded. ${parsedError}`);
      }
      throw new Error(`trace.moe API error (${response.status}): ${parsedError}`);
    }

    return (await response.json()) as SearchResponse;
  }

  /**
   * Search anime by title/synonym using /anilist?q=...
   */
  async searchAnilist(query: string): Promise<AnilistSearchResultItem[]> {
    const url = `${this.baseUrl}/anilist?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`trace.moe anilist search failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as AnilistSearchResultItem[];
  }

  /**
   * Get user quota, priority, concurrency, and usage info from /me
   */
  async getMe(): Promise<UserResponse> {
    const url = `${this.baseUrl}/me`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`trace.moe /me failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as UserResponse;
  }
}

export const defaultClient = new TraceMoeClient();
