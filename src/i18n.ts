export type LanguageCode =
  | "en"
  | "zh"
  | "zh-hans"
  | "zh-cn"
  | "zh-sg"
  | "zh-hant"
  | "zh-tw"
  | "zh-hk"
  | "zh-mo"
  | "ja"
  | string;

export interface I18nStrings {
  searchResultsHeader: string;
  noResultsFound: string;
  similarity: string;
  episode: string;
  timestamp: string;
  anilist: string;
  previewImage: string;
  previewVideo: string;
  quotaHeader: string;
  quotaId: string;
  quotaRemaining: string;
  quotaUsed: string;
  concurrencyLimit: string;
  queuePriority: string;
  nameSearchHeader: string;
  nameSearchNoResults: string;
  matchScore: string;
}

export const i18nEn: I18nStrings = {
  searchResultsHeader:
    "### trace.moe Search Results (Found {count} matches, compared {frameCount} frames)",
  noResultsFound: "No matching anime scene found on trace.moe.",
  similarity: "similarity",
  episode: "Episode",
  timestamp: "Timestamp",
  anilist: "Anilist",
  previewImage: "Preview Image",
  previewVideo: "Preview Video",
  quotaHeader: "### trace.moe Account Quota & Status",
  quotaId: "ID",
  quotaRemaining: "Remaining Daily Quota",
  quotaUsed: "Searches Used (last 24h)",
  concurrencyLimit: "Concurrency Limit",
  queuePriority: "Search Queue Priority",
  nameSearchHeader: '### Anime Search Results for "{query}" (Found {count} matches):',
  nameSearchNoResults: 'No anime found matching query: "{query}"',
  matchScore: "Match",
};

export const i18nZhHans: I18nStrings = {
  searchResultsHeader: "### trace.moe 搜索结果 (找到 {count} 个匹配，已比对 {frameCount} 帧)",
  noResultsFound: "无法在 trace.moe 中找到匹配的结果。",
  similarity: "相似度",
  episode: "集数",
  timestamp: "时间点",
  anilist: "Anilist 链接",
  previewImage: "预览图片",
  previewVideo: "预览视频",
  quotaHeader: "### trace.moe 账户配额与状态",
  quotaId: "账户 ID",
  quotaRemaining: "每日剩余配额",
  quotaUsed: "过去 24 小时已用次数",
  concurrencyLimit: "并发限制",
  queuePriority: "队列优先级",
  nameSearchHeader: '### "{query}" 的动漫搜索结果 (找到 {count} 个匹配):',
  nameSearchNoResults: '未找到与 "{query}" 匹配的动漫',
  matchScore: "匹配度",
};

export const i18nZhHant: I18nStrings = {
  searchResultsHeader: "### trace.moe 搜尋結果 (找到 {count} 個匹配，已比對 {frameCount} 幀)",
  noResultsFound: "無法在 trace.moe 中找到匹配的結果。",
  similarity: "相似度",
  episode: "集數",
  timestamp: "時間點",
  anilist: "Anilist 連結",
  previewImage: "預覽圖片",
  previewVideo: "預覽影片",
  quotaHeader: "### trace.moe 帳戶配額與狀態",
  quotaId: "帳戶 ID",
  quotaRemaining: "每日剩餘配額",
  quotaUsed: "過去 24 小時已用次數",
  concurrencyLimit: "並發限制",
  queuePriority: "隊列優先級",
  nameSearchHeader: "### 「{query}」的動漫搜尋結果 (找到 {count} 個匹配):",
  nameSearchNoResults: "未找到與「{query}」匹配的動漫",
  matchScore: "匹配度",
};

export const i18nJa: I18nStrings = {
  searchResultsHeader: "### trace.moe 検索結果 ({count} 件の一致、{frameCount} フレームを比較)",
  noResultsFound: "trace.moe で一致する結果が見つかりませんでした。",
  similarity: "類似度",
  episode: "エピソード",
  timestamp: "タイムスタンプ",
  anilist: "Anilist リンク",
  previewImage: "プレビュー画像",
  previewVideo: "プレビュー動画",
  quotaHeader: "### trace.moe アカウントクォータとステータス",
  quotaId: "ID",
  quotaRemaining: "1日の残りクォータ",
  quotaUsed: "過去24時間の検索使用数",
  concurrencyLimit: "並行リクエスト制限",
  queuePriority: "検索キュー優先度",
  nameSearchHeader: "### 「{query}」の検索結果 ({count} 件の一致):",
  nameSearchNoResults: "「{query}」に一致するアニメは見つかりませんでした",
  matchScore: "一致率",
};

export const locales: Record<string, I18nStrings> = {
  en: i18nEn,
  zh: i18nZhHant,
  "zh-hans": i18nZhHans,
  "zh-cn": i18nZhHans,
  "zh-sg": i18nZhHans,
  "zh-hant": i18nZhHant,
  "zh-tw": i18nZhHant,
  "zh-hk": i18nZhHant,
  "zh-mo": i18nZhHant,
  ja: i18nJa,
};

export function getEffectiveLanguage(lang?: string): string {
  const code = (lang || process.env.TRACE_MOE_LANG || "en").toLowerCase();
  const primary = code.split("-")[0];
  if (locales[code]) return code;
  if (locales[primary]) return primary;
  return "en";
}

export function getI18nStrings(lang?: string): I18nStrings {
  const effective = getEffectiveLanguage(lang);
  const primary = effective.split("-")[0];
  return locales[effective] || locales[primary] || i18nEn;
}
