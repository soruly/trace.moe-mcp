# trace.moe-mcp

[![License](https://img.shields.io/github/license/soruly/trace.moe-mcp.svg?style=flat-square&)](https://github.com/soruly/trace.moe-mcp/blob/master/LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/soruly/trace.moe-mcp/node.js.yml?style=flat-square)](https://github.com/soruly/trace.moe-mcp/actions)
[![npm](https://img.shields.io/npm/v/trace.moe-mcp.svg?style=flat-square)](https://www.npmjs.com/package/trace.moe-mcp)
[![Discord](https://img.shields.io/discord/437578425767559188.svg?style=flat-square)](https://discord.gg/K9jn6Kj)

Model Context Protocol (MCP) server to use [trace.moe](https://trace.moe) with your large language model.

![Antigravity Demo](https://images.plurk.com/2HpIzS2TntWZyhzWf2ZC3C.png)

With LLM, language is not a problem. You can ask in any language you want.

![Antigravity Demo in Chinese](https://images.plurk.com/5afs1YgjSTJr3fClytUicI.png)

## Installation & Running

Prerequisites: Node.js 24 or higher.

Open MCP Config and add the following configuration:

```json
{
  "mcpServers": {
    "trace_moe": {
      "command": "npx",
      "args": ["-y", "trace.moe-mcp"]
    }
  }
}
```

(Optional) If you have an API key from [https://trace.moe/](https://trace.moe/), you can add `TRACE_MOE_API_KEY` to the configuration:

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

## Features

- **Local Image Processing**: Only image hash is sent to trace.moe, so your images are not uploaded to trace.moe.
- **Black Borders Cropping**: Detects and crops black borders automatically.
- **Multiple Image Sources**: Supports direct Image URLs, local file paths, base64 strings, or pre-computed vectors.
- **Anime Title & Metadata Search**: Search anime titles, romanized names, and synonyms via `/anilist`.
- **Account & Quota Status**: Check remaining quota, concurrency limits, and priority via `/me` resource and tool.

## Available Tools

| Tool                         | Description                                                                                                                                                                          |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_anime_by_image_url`  | `url` (string, required)<br>`cutBorders` (boolean, default true)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional)                                          |
| `search_anime_by_image_file` | `filePath` (string, optional)<br>`imageBase64` (string, optional)<br>`cutBorders` (boolean, default true)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional) |
| `search_anime_by_vector`     | `vector` (array of 33 numbers, required)<br>`anilistInfo` (boolean, default true)<br>`anilistID` (number, optional)                                                                  |
| `search_anime_by_name`       | `query` (string, required)                                                                                                                                                           |
| `get_account_quota`          | Check current search quota, concurrency limit                                                                                                                                        |

## Available Resources

- `tracemoe://me` - Current search quota, concurrency, and 24h usage status in JSON format.

## Available Prompts

- `trace_moe` - Prompt template guiding the AI model on how to identify an anime screenshot.

## Environment Variables

- `TRACE_MOE_API_KEY`: Optional API key sent via `x-trace-key` for higher rate limits and daily quota.
- `TRACE_MOE_API_HOST`: Optional custom API endpoint (defaults to `https://api.trace.moe`).
