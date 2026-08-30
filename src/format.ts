import {
  type AnilistData,
  type AnilistSearchResultItem,
  type SearchResponse,
  type SearchResultItem,
  type UserResponse,
} from "./api.ts";

/**
 * Formats seconds into MM:SS or HH:MM:SS format.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats a similarity float (0.0 - 1.0) into a percentage string (e.g. "98.5%").
 */
export function formatSimilarity(similarity: number): string {
  return `${(similarity * 100).toFixed(1)}%`;
}

/**
 * Extracts anime titles for all languages (native Japanese, romaji, English, Chinese).
 * Returns primary English/Romaji title and the full list of titles across all languages.
 */
export function getAnimeTitles(anilist: number | AnilistData): {
  primary: string;
  titles: string[];
  id: number;
} {
  if (typeof anilist === "number") {
    return { primary: `Anilist ID ${anilist}`, titles: [`Anilist ID ${anilist}`], id: anilist };
  }

  const { chinese, english, native, romaji } = anilist.title || {};
  const titles: string[] = [];

  if (native && !titles.includes(native)) titles.push(native);
  if (romaji && !titles.includes(romaji)) titles.push(romaji);
  if (english && !titles.includes(english)) titles.push(english);
  if (chinese && !titles.includes(chinese)) titles.push(chinese);

  if (titles.length === 0) {
    titles.push(`Anilist ID ${anilist.id}`);
  }

  const primary = english || romaji || native || chinese || `Anilist ID ${anilist.id}`;

  return {
    primary,
    titles,
    id: anilist.id,
  };
}

/**
 * Formats episode information into a readable string (e.g. "1/12", "1-2/12", "1", "1-2").
 * Prefers episode_start and episode_end (aligned with Anilist episode count) over filename episode.
 * Returns null if episode is unknown.
 */
export function formatEpisode(item: SearchResultItem): string | null {
  let epText: string | null = null;

  if (item.episode_start !== undefined && item.episode_start !== null) {
    if (
      item.episode_end !== undefined &&
      item.episode_end !== null &&
      item.episode_end !== item.episode_start
    ) {
      epText = `${item.episode_start}-${item.episode_end}`;
    } else {
      epText = String(item.episode_start);
    }
  } else if (item.episode !== undefined && item.episode !== null && item.episode !== "") {
    if (Array.isArray(item.episode)) {
      epText = item.episode.join(", ");
    } else {
      epText = String(item.episode);
    }
  }

  if (!epText) {
    return null;
  }

  // If total episode count from Anilist is available, append /total (e.g. "1/12")
  if (typeof item.anilist === "object" && item.anilist !== null && item.anilist.episodes) {
    epText = `${epText}/${item.anilist.episodes}`;
  }

  return epText;
}

/**
 * Formats a list of search results into markdown.
 */
export function formatSearchResultsMarkdown(response: SearchResponse): string {
  if (!response.result || response.result.length === 0) {
    return "No matching anime scene found on trace.moe.";
  }

  const lines: string[] = [];
  lines.push(
    `### trace.moe Search Results (Found ${response.result.length} matches, compared ${response.frameCount.toLocaleString()} frames)`,
  );
  lines.push("");

  response.result.slice(0, 5).forEach((item, index) => {
    const titleInfo = getAnimeTitles(item.anilist);
    const ep = formatEpisode(item);
    const timeRange = `${formatTime(item.from)} - ${formatTime(item.to)}`;
    const sim = formatSimilarity(item.similarity);
    const warningEmoji = item.similarity < 0.8 ? " ⚠️" : "";

    lines.push(`#### ${index + 1}. ${titleInfo.primary}${warningEmoji} (${sim} similarity)`);
    for (const t of titleInfo.titles) {
      if (t !== titleInfo.primary) {
        lines.push(`- ${t}`);
      }
    }
    if (ep) {
      lines.push(`- **Episode**: ${ep}`);
    }
    lines.push(`- **Timestamp**: \`${timeRange}\``);
    lines.push(
      `- **Anilist**: [https://anilist.co/anime/${titleInfo.id}](https://anilist.co/anime/${titleInfo.id})`,
    );
    lines.push(`- **Preview Image**: ${item.image}`);
    lines.push(`- **Preview Video**: ${item.video}`);
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Formats anime name search results into markdown.
 */
export function formatAnilistSearchResultsMarkdown(
  results: AnilistSearchResultItem[],
  query: string,
): string {
  if (!results || results.length === 0) {
    return `No anime found matching query: "${query}"`;
  }

  const lines = [`### Anime Search Results for "${query}" (Found ${results.length} matches):`, ""];

  results.slice(0, 10).forEach((item, idx) => {
    const titleInfo = getAnimeTitles(item.anilist);
    const sim = (item.similarity * 100).toFixed(0);
    lines.push(
      `#### ${idx + 1}. ${titleInfo.primary} (Match: ${sim}%, Anilist ID: \`${item.id}\`)`,
    );
    for (const t of titleInfo.titles) {
      if (t !== titleInfo.primary) {
        lines.push(`- ${t}`);
      }
    }
    lines.push(
      `- **Anilist**: [https://anilist.co/anime/${item.id}](https://anilist.co/anime/${item.id})`,
    );
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Formats user quota information into markdown.
 */
export function formatUserQuotaMarkdown(user: UserResponse): string {
  const remaining = Math.max(0, user.quota - user.quotaUsed);
  return `### trace.moe Account Quota & Status
- **ID**: \`${user.id}\`
- **Remaining Daily Quota**: **${remaining.toLocaleString()}** / ${user.quota.toLocaleString()}
- **Searches Used (last 24h)**: ${user.quotaUsed.toLocaleString()}
- **Concurrency Limit**: ${user.concurrency}
- **Search Queue Priority**: ${user.priority}
`;
}
