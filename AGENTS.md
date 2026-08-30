# AGENTS.md

## Project Overview

**trace.moe-mcp** is a Model Context Protocol (MCP) server for [trace.moe](https://trace.moe) (anime scene search engine). It exposes tools, resources, and prompt templates to AI agents and MCP clients (Claude Desktop, Cursor, Antigravity, etc.) to search anime scenes by image URL, file, base64, or precomputed visual vectors.

### Core Tech Stack

- **Runtime**: Node.js >= 24 (executes `.ts` files directly via native TypeScript support)
- **Protocol**: Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` (Stdio transport)
- **Language**: TypeScript
- **Image & Vector Processing**: `sharp`, `trace.moe-id`
- **Schema & Validation**: `zod`
- **Code Quality & Formatting**: `oxlint`, `oxfmt`
- **Testing**: Node.js native test runner (`node --test`)

---

## Directory Structure

```
├── index.ts                     # MCP server entry point & tool/resource/prompt registrations
├── package.json                 # Project dependencies, scripts, bin definition, and engines
├── tsconfig.json                # TypeScript configuration
├── .oxfmtrc.json                # oxfmt code formatter configuration
├── README.md                    # User documentation & MCP client configuration guides
├── LICENSE                      # MIT License
├── SECURITY.md                  # Security policy
├── CODE_OF_CONDUCT.md           # Contributor Covenant Code of Conduct
├── src/                         # Server internal modules
│   ├── api.ts                   # trace.moe HTTP client (vector search, anilist, quota)
│   ├── format.ts                # Markdown response formatters for search results & quota
│   └── image-processor.ts       # Image loading, black border trimming, and 33-element vector extraction
└── test/                        # Automated unit tests
    └── image-processor.test.ts  # Tests for vector extraction, border cropping, and formatters
```

---

## Command Reference

| Action                  | Command              | Notes                                             |
| :---------------------- | :------------------- | :------------------------------------------------ |
| **Start Server**        | `npm start`          | Runs `node index.ts` via Stdio transport          |
| **Format Code**         | `npm run format`     | Formats all project files in-place using `oxfmt`  |
| **Lint**                | `npm run lint`       | Checks code using `oxlint`                        |
| **Lint & Fix**          | `npm run lint:fix`   | Automatically fixes lint issues with `oxlint`     |
| **Test & Verify**       | `npm run test`       | Runs `oxfmt --check`, `oxlint`, and `node --test` |
| **Direct TS Execution** | `node <filepath>.ts` | Runs any `.ts` script directly in Node >= 24      |

---

## Coding & Operational Guidelines

### 1. Direct TypeScript Execution

- This project runs TypeScript directly with Node.js >= 24 without any build step, transpiler, or `tsc`.
- All imports between local TypeScript files must explicitly include the `.ts` extension (e.g. `import { defaultClient } from "./src/api.ts";`).

### 2. MCP Stdio Protocol Hygiene

- The MCP stdio transport uses standard input/output (`stdin` / `stdout`) exclusively for JSON-RPC messages.
- **NEVER use `console.log()` to stdout** anywhere in application code, as this corrupts the JSON-RPC stream and breaks MCP client connections.
- Always use `console.error()` for error reporting or diagnostic logs, which streams safely to `stderr`.

### 3. Local Feature Extraction

- Rather than uploading raw images to the remote API, the server decodes images locally via `sharp`, trims letterbox/pillarbox bars (`cutBorders`), and extracts a 33-element MPEG-7 Color Layout Descriptor vector using `trace.moe-id`.
- Only the compact vector (~150 bytes JSON payload) is transmitted over the network, minimizing bandwidth usage and preserving privacy.

### 4. Verification Workflow

Before committing changes, ensure that formatting, linting, and unit tests pass:

```bash
npm run test
```
