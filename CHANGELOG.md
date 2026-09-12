# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-12

### Fixed

- Added TypeScript build output (`dist/`) and configuration for npm distribution.

## [1.0.0] - 2026-09-12

### Added

- Initial release of Model Context Protocol (MCP) server for [trace.moe](https://trace.moe).
- Local image pre-processing and 33-element Color Layout Descriptor extraction using `sharp` and `trace.moe-id`.
- MCP tools:
  - `search_anime_by_image_url`: Search anime scene by image URL.
  - `search_anime_by_image_file`: Search anime scene by local image file path or Base64 string.
  - `search_anime_by_vector`: Search anime scene by 33-element vector.
  - `search_anime_by_name`: Search anime titles and retrieve AniList metadata.
  - `get_account_quota`: Check account search quota and limits.
- MCP resource: `tracemoe://me` for account quota and priority status.
- MCP prompt: `trace_moe` for anime screenshot identification.
