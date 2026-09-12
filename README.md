# trace.moe-mcp

[![License](https://img.shields.io/github/license/soruly/trace.moe-mcp.svg?style=flat-square&)](https://github.com/soruly/trace.moe-mcp/blob/master/LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/soruly/trace.moe-mcp/node.js.yml?style=flat-square)](https://github.com/soruly/trace.moe-mcp/actions)
[![npm](https://img.shields.io/npm/v/trace.moe-mcp.svg?style=flat-square)](https://www.npmjs.com/package/trace.moe-mcp)
[![Discord](https://img.shields.io/discord/437578425767559188.svg?style=flat-square)](https://discord.gg/K9jn6Kj)

Model Context Protocol (MCP) server for [trace.moe](https://trace.moe) anime scene search API.

## Features

- **Local Image Pre-processing & Vector Extraction**:
  - Automatically loads and decodes images locally (JPEG, PNG, WebP, AVIF, etc.).
  - Detects and crops black letterbox/pillarbox borders (`cutBorders`).
  - Computes the 33-element MPEG-7 Color Layout Descriptor vector using 8×8 2D-DCT locally.
  - Sends **only the compact 33-number vector** (~150 bytes JSON payload) to `api.trace.moe`, minimizing bandwidth and keeping image content private.
- **Multiple Image Sources**: Supports direct Image URLs, local file paths, base64 strings, or pre-computed vectors.
- **Anime Title & Metadata Search**: Search anime titles, romanized names, and synonyms via `/anilist`.
- **Account & Quota Status**: Check remaining quota, concurrency limits, and priority via `/me` resource and tool.
- **Guided AI Prompt Template**: `identify_anime_scene` prompt template for LLMs.

## Available Tools

| Tool                         | Description                                                                   | Inputs                                                                                                                                                                               |
| :--------------------------- | :---------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_anime_by_image_url`  | Search anime scene by image URL (preprocessed locally into 33-element vector) | `url` (string, required)<br>`cutBorders` (boolean, default true)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional)                                          |
| `search_anime_by_image_file` | Search anime scene from local file path or base64 string                      | `filePath` (string, optional)<br>`imageBase64` (string, optional)<br>`cutBorders` (boolean, default true)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional) |
| `search_anime_by_vector`     | Search anime scene directly using a 33-element color layout vector            | `vector` (array of 33 numbers, required)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional)                                                                  |
| `search_anime_by_name`       | Search anime metadata and retrieve Anilist IDs by name/title                  | `query` (string, required)                                                                                                                                                           |
| `get_account_quota`          | Check current daily search quota, concurrency limit, and priority             | _(None)_                                                                                                                                                                             |

## Available Resources

- `tracemoe://me` - Current search quota, priority, concurrency, and 24h usage status in JSON format.

## Available Prompts

- `trace_moe` - Prompt template guiding the AI model on how to identify an anime screenshot.

## Environment Variables

- `TRACE_MOE_API_KEY`: Optional API key sent via `x-trace-key` for higher rate limits and daily quota.
- `TRACE_MOE_API_HOST`: Optional custom API endpoint (defaults to `https://api.trace.moe`).

## Installation & Running

### Option 1: Run with `npx` (No installation required)

```bash
npx -y trace.moe-mcp
```

### Option 2: Run directly from source

```bash
git clone https://github.com/soruly/trace.moe-mcp.git
cd trace.moe-mcp
npm install
node index.ts
```

### MCP Client Configuration (Claude Desktop, Cursor, Antigravity, etc.)

#### Using `npx`:

```json
{
  "mcpServers": {
    "trace_moe": {
      "command": "npx",
      "args": ["-y", "trace.moe-mcp"],
      "env": {
        "TRACE_MOE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Using local repository:

```json
{
  "mcpServers": {
    "trace_moe": {
      "command": "node",
      "args": ["/absolute/path/to/trace.moe-mcp/index.ts"],
      "env": {
        "TRACE_MOE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
