import {
  type AnilistData,
  type AnilistSearchResultItem,
  type SearchResponse,
  type SearchResultItem,
  type UserResponse,
} from "./api.ts";
import { getEffectiveLanguage, getI18nStrings } from "./i18n.ts";

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
 * Extracts titles filtered by language preference (en, zh, ja).
 * English titles are not shown to Chinese and Japanese users, matching trace.moe-telegram-bot.
 */
export function getAnimeTitles(
  anilist: number | AnilistData,
  lang?: string,
): {
  primary: string;
  titles: string[];
  id: number;
} {
  if (typeof anilist === "number") {
    return { primary: `Anilist ID ${anilist}`, titles: [`Anilist ID ${anilist}`], id: anilist };
  }

  const { chinese, english, native, romaji } = anilist.title || {};
  const code = getEffectiveLanguage(lang);
  const isEn = code.startsWith("en");
  const isZh = code.startsWith("zh");
  const isJa = code.startsWith("ja");

  const titles: string[] = [];
  // 1. Native Japanese title is always included
  if (native) titles.push(native);
  // 2. Chinese title is only shown if language is Chinese
  if (chinese && isZh && !titles.includes(chinese)) titles.push(chinese);
  // 3. Romaji title is shown for English or fallback if no native/chinese
  if (romaji && !titles.includes(romaji)) {
    if (!(isZh || isJa) || titles.length === 0) titles.push(romaji);
  }
  // 4. English title is ONLY shown if language is English
  if (english && isEn && !titles.includes(english)) titles.push(english);

  if (titles.length === 0) {
    titles.push(`Anilist ID ${anilist.id}`);
  }

  // Primary display title
  let primary: string;
  if (isZh) {
    primary = chinese || native || romaji || `Anilist ID ${anilist.id}`;
  } else if (isJa) {
    primary = native || romaji || `Anilist ID ${anilist.id}`;
  } else {
    primary = english || romaji || native || `Anilist ID ${anilist.id}`;
  }

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
 * Formats a list of search results into localized markdown.
 */
export function formatSearchResultsMarkdown(response: SearchResponse, lang?: string): string {
  const i18n = getI18nStrings(lang);
  if (!response.result || response.result.length === 0) {
    return i18n.noResultsFound;
  }

  const lines: string[] = [];
  lines.push(
    i18n.searchResultsHeader
      .replace("{count}", String(response.result.length))
      .replace("{frameCount}", response.frameCount.toLocaleString()),
  );
  lines.push("");

  response.result.slice(0, 5).forEach((item, index) => {
    const titleInfo = getAnimeTitles(item.anilist, lang);
    const ep = formatEpisode(item);
    const timeRange = `${formatTime(item.from)} - ${formatTime(item.to)}`;
    const sim = formatSimilarity(item.similarity);
    const confidenceEmoji = item.similarity >= 0.9 ? "🎯" : item.similarity >= 0.8 ? "🔍" : "⚠️";

    lines.push(
      `#### ${index + 1}. ${titleInfo.primary} ${confidenceEmoji} (${sim} ${i18n.similarity})`,
    );
    for (const t of titleInfo.titles) {
      if (t !== titleInfo.primary) {
        lines.push(`- ${t}`);
      }
    }
    if (ep) {
      lines.push(`- **${i18n.episode}**: ${ep}`);
    }
    lines.push(`- **${i18n.timestamp}**: \`${timeRange}\``);
    lines.push(
      `- **${i18n.anilist}**: [https://anilist.co/anime/${titleInfo.id}](https://anilist.co/anime/${titleInfo.id})`,
    );
    lines.push(`- **${i18n.previewImage}**: ${item.image}`);
    lines.push(`- **${i18n.previewVideo}**: ${item.video}`);
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Formats anime name search results into localized markdown.
 */
export function formatAnilistSearchResultsMarkdown(
  results: AnilistSearchResultItem[],
  query: string,
  lang?: string,
): string {
  const i18n = getI18nStrings(lang);
  if (!results || results.length === 0) {
    return i18n.nameSearchNoResults.replace("{query}", query);
  }

  const lines = [
    i18n.nameSearchHeader.replace("{query}", query).replace("{count}", String(results.length)),
    "",
  ];

  results.slice(0, 10).forEach((item, idx) => {
    const titleInfo = getAnimeTitles(item.anilist, lang);
    const sim = (item.similarity * 100).toFixed(0);
    lines.push(
      `#### ${idx + 1}. ${titleInfo.primary} (${i18n.matchScore}: ${sim}%, Anilist ID: \`${item.id}\`)`,
    );
    for (const t of titleInfo.titles) {
      if (t !== titleInfo.primary) {
        lines.push(`- ${t}`);
      }
    }
    lines.push(
      `- **${i18n.anilist}**: [https://anilist.co/anime/${item.id}](https://anilist.co/anime/${item.id})`,
    );
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Formats user quota information into localized markdown.
 */
export function formatUserQuotaMarkdown(user: UserResponse, lang?: string): string {
  const i18n = getI18nStrings(lang);
  const remaining = Math.max(0, user.quota - user.quotaUsed);
  return `${i18n.quotaHeader}
- **${i18n.quotaId}**: \`${user.id}\`
- **${i18n.quotaRemaining}**: **${remaining.toLocaleString()}** / ${user.quota.toLocaleString()}
- **${i18n.quotaUsed}**: ${user.quotaUsed.toLocaleString()}
- **${i18n.concurrencyLimit}**: ${user.concurrency}
- **${i18n.queuePriority}**: ${user.priority}
`;
}
