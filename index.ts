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
    },
  },
  async ({ url, cutBorders, anilistInfo, anilistID }) => {
    try {
      const vector = await processImageToVector({ url }, cutBorders);
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult);

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
    },
  },
  async ({ filePath, imageBase64, cutBorders, anilistInfo, anilistID }) => {
    try {
      if (!filePath && !imageBase64) {
        throw new Error("Must provide either 'filePath' or 'imageBase64'.");
      }

      const vector = await processImageToVector({ filePath, imageBase64 }, cutBorders);
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult);

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
    },
  },
  async ({ vector, anilistInfo, anilistID }) => {
    try {
      const searchResult = await defaultClient.searchByVector(vector, {
        anilistInfo,
        anilistID,
      });

      const markdown = formatSearchResultsMarkdown(searchResult);

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
    },
  },
  async ({ query }) => {
    try {
      const results = await defaultClient.searchAnilist(query);
      const markdown = formatAnilistSearchResultsMarkdown(results, query);

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
    inputSchema: {},
  },
  async () => {
    try {
      const user = await defaultClient.getMe();
      const markdown = formatUserQuotaMarkdown(user);
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
      "Guide the model on identifying an anime screenshot scene using trace.moe and presenting accurate information.",
    argsSchema: {
      imageUrl: z.string().optional().describe("URL of the anime scene image to identify"),
      filePath: z
        .string()
        .optional()
        .describe("Local file path of the anime scene image to identify"),
      notes: z.string().optional().describe("Additional clues or context"),
    },
  },
  ({ imageUrl, filePath, notes }) => {
    const promptText = `Please identify the anime scene from the provided image ${imageUrl ? `at ${imageUrl}` : ""}${filePath ? `(file: ${filePath})` : ""}.${notes ? ` Additional context: ${notes}` : ""}

Steps to follow:
1. Use the 'search_anime_by_image_url' or 'search_anime_by_image_file' tool to search trace.moe.
2. If similarity is >= 85%, report the matched Anime Title (English, Romaji, and Native Japanese), Episode number, and exact timestamp (e.g. 00:12:34).
3. Include the Anilist link and preview thumbnail / video clip URL for verification.
4. If similarity is low (< 80%), warn the user that the match might be uncertain.`;

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
