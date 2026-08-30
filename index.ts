#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { defaultClient } from "./src/api.ts";
import {
  formatAnilistSearchResultsMarkdown,
  formatSearchResultsMarkdown,
  formatUserQuotaMarkdown,
} from "./src/format.ts";
import { processImageToVector } from "./src/image-processor.ts";

const server = new McpServer({
  name: "trace.moe-mcp",
  version: "1.0.0",
});

const langSchema = z
  .enum(["en", "zh", "zh-hans", "zh-hant", "zh-cn", "zh-tw", "zh-hk", "ja"])
  .optional()
  .describe(
    "Preferred language for titles and output: 'en', 'zh-hans' (Simplified Chinese), 'zh-hant' / 'zh' (Traditional Chinese), 'ja' (Japanese). Defaults to TRACE_MOE_LANG or 'en'.",
  );

// Tool: Search Anime by Image URL (with local vector preprocessing)
server.registerTool(
  "search_anime_by_image_url",
  {
    title: "Search Anime by Image URL",
    description:
      "Search anime scene by image URL. Pre-processes the image locally into a 33-element Color Layout Descriptor vector and sends only the vector to api.trace.moe.",
    inputSchema: {
      url: z.url().describe("Direct HTTP/HTTPS URL of the anime screenshot"),
      cutBorders: z
        .boolean()
        .optional()
        .default(true)
        .describe("Automatically crop black letterbox or pillarbox borders before searching"),
      anilistInfo: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include full anime titles and metadata"),
      anilistID: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional Anilist ID to filter search results within a specific anime"),
      lang: langSchema,
    },
  },
  async ({ url, cutBorders, anilistInfo, anilistID, lang }) => {
    try {
      const vector = await processImageToVector({ url }, cutBorders);
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult, lang);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: JSON.stringify(searchResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to search anime by image URL: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Search Anime by Local File or Base64 Image
server.registerTool(
  "search_anime_by_image_file",
  {
    title: "Search Anime by Image File or Base64",
    description:
      "Search anime scene from a local file path or base64 encoded image. Pre-processes the image locally into a 33-element vector and sends only the vector to api.trace.moe.",
    inputSchema: {
      filePath: z
        .string()
        .optional()
        .describe("Local absolute or relative filesystem path to the image file"),
      imageBase64: z
        .string()
        .optional()
        .describe("Base64-encoded image string (with or without data URI scheme prefix)"),
      cutBorders: z
        .boolean()
        .optional()
        .default(true)
        .describe("Automatically crop black letterbox or pillarbox borders before searching"),
      anilistInfo: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include full anime titles and metadata"),
      anilistID: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional Anilist ID to filter search results within a specific anime"),
      lang: langSchema,
    },
  },
  async ({ filePath, imageBase64, cutBorders, anilistInfo, anilistID, lang }) => {
    try {
      if (!filePath && !imageBase64) {
        throw new Error("Must provide either 'filePath' or 'imageBase64'.");
      }

      const vector = await processImageToVector({ filePath, imageBase64 }, cutBorders);
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult, lang);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: JSON.stringify(searchResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to search anime by image file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Search Anime by 33-element Color Layout Vector
server.registerTool(
  "search_anime_by_vector",
  {
    title: "Search Anime by Color Layout Vector",
    description:
      "Search anime scene directly using a 33-element MPEG-7 Color Layout Descriptor vector.",
    inputSchema: {
      vector: z
        .array(z.number())
        .length(33)
        .describe("33-element integer vector representing MPEG-7 Color Layout Descriptor"),
      anilistInfo: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include full anime titles and metadata"),
      anilistID: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional Anilist ID to filter search results within a specific anime"),
      lang: langSchema,
    },
  },
  async ({ vector, anilistInfo, anilistID, lang }) => {
    try {
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult, lang);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: JSON.stringify(searchResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to search anime by vector: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Search Anime by Name
server.registerTool(
  "search_anime_by_name",
  {
    title: "Search Anime by Name",
    description:
      "Search anime titles, romanized names, and synonyms using trace.moe Anilist database to retrieve Anilist IDs and metadata.",
    inputSchema: {
      query: z
        .string()
        .min(1)
        .describe("Anime name, Chinese name, Japanese name, or keyword to search"),
      lang: langSchema,
    },
  },
  async ({ query, lang }) => {
    try {
      const results = await defaultClient.searchAnilist(query);
      const markdown = formatAnilistSearchResultsMarkdown(results, query, lang);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to search anime by name: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Get Account Quota & Concurrency
server.registerTool(
  "get_account_quota",
  {
    title: "Get Account Quota & Concurrency",
    description:
      "Check remaining daily search quota, concurrency limit, and priority for the current IP / API key on trace.moe.",
    inputSchema: {
      lang: langSchema,
    },
  },
  async ({ lang }) => {
    try {
      const user = await defaultClient.getMe();
      const markdown = formatUserQuotaMarkdown(user, lang);
      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to get quota: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Resource: tracemoe://me
server.registerResource(
  "user-quota",
  "tracemoe://me",
  {
    mimeType: "application/json",
    description: "Current trace.moe search quota, limits, and usage",
  },
  async () => {
    const user = await defaultClient.getMe();
    return {
      contents: [
        {
          uri: "tracemoe://me",
          mimeType: "application/json",
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  },
);

// Prompt: trace_moe
server.registerPrompt(
  "trace_moe",
  {
    title: "Trace Anime Scene",
    description:
      "Guide the model on identifying an anime screenshot scene using trace.moe and presenting accurate information in English, Chinese, or Japanese.",
    argsSchema: {
      imageUrl: z.string().optional().describe("URL of the anime scene image to identify"),
      filePath: z
        .string()
        .optional()
        .describe("Local file path of the anime scene image to identify"),
      notes: z.string().optional().describe("Additional clues or context"),
      lang: z
        .enum(["en", "zh", "zh-hans", "zh-hant", "zh-cn", "zh-tw", "zh-hk", "ja"])
        .optional()
        .default("en")
        .describe("Preferred response language (en, zh-hans, zh-hant, ja)"),
    },
  },
  ({ imageUrl, filePath, notes, lang }) => {
    let promptText: string;
    const l = (lang || "en").toLowerCase();
    if (l === "zh-hans" || l === "zh-cn" || l === "zh-sg") {
      promptText = `请识别所提供的动漫截图 ${imageUrl ? `(${imageUrl})` : ""}${filePath ? `(文件路径: ${filePath})` : ""}${notes ? `，备注信息：${notes}` : ""}。

执行步骤：
1. 使用 trace.moe 搜索工具检索该截图（可传入 lang: "zh-hans"）。
2. 给出匹配的动画中文译名、日文原名、集数与精确时间点（分:秒）。
3. 附上相似度百分比、Anilist 链接与视频预览地址。
4. 若相似度低于 80%，请提醒用户该结果可能不够准确。`;
    } else if (l.startsWith("zh")) {
      promptText = `請識別所提供的動漫截圖 ${imageUrl ? `(${imageUrl})` : ""}${filePath ? `(檔案路徑: ${filePath})` : ""}${notes ? `，備註資訊：${notes}` : ""}。

執行步驟：
1. 使用 trace.moe 搜尋工具檢索該截圖（可傳入 lang: "zh-hant"）。
2. 給出匹配的動畫中文譯名、日文原名、集數與精確時間點（分:秒）。
3. 附上相似度百分比、Anilist 連結與影片預覽位址。
4. 若相似度低於 80%，請提醒用戶該結果可能不夠準確。`;
    } else if (l === "ja") {
      promptText = `提供されたアニメのスクリーンショットを特定してください ${imageUrl ? `(${imageUrl})` : ""}${filePath ? `(ファイルパス: ${filePath})` : ""}${notes ? `、補足情報: ${notes}` : ""}。

手順:
1. trace.moe 検索ツールを使用してスクリーンショットを検索します (lang: "ja" を指定)。
2. アニメのタイトル (日本語原題)、エピソード番号、正確なタイムスタンプ (分:秒) を提示してください。
3. 類似度パーセンテージ、Anilist リンク、プレビュー動画 URL を記載してください。
4. 類似度が 80% 未満の場合は、結果が不確実である可能性をユーザーに警告してください。`;
    } else {
      promptText = `Please identify the anime scene from the provided image ${imageUrl ? `at ${imageUrl}` : ""}${filePath ? `(file: ${filePath})` : ""}.${notes ? ` Additional context: ${notes}` : ""}

Steps to follow:
1. Use the 'search_anime_by_image_url' or 'search_anime_by_image_file' tool to search trace.moe (with lang: "en").
2. If similarity is >= 85%, report the matched Anime Title (English & Romaji), Episode number, and exact timestamp (e.g. 00:12:34).
3. Include the Anilist link and preview thumbnail / video clip URL for verification.
4. If similarity is low (< 80%), warn the user that the match might be uncertain.`;
    }

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  },
);

// Start server using Stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error running trace.moe MCP server:", err);
  process.exit(1);
});
