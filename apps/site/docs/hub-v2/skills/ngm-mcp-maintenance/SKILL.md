---
name: ngm-mcp-maintenance
description: Use when Codex needs to add, update, review, or document ng-manager MCP tools in packages/mcp-server, especially Hub V2 tools, including tool schemas, registration, catalog entries, tests, README updates, Hub V2 token/API docs alignment, and skill documentation synchronization.
---

# NGM MCP Maintenance

## Overview

Use this skill to keep `packages/mcp-server` tool implementation, tool registration, tests, and Hub V2 documentation aligned. Treat MCP as a controlled tool gateway, not as a second business server.

For Hub V2-specific tool names, docs, and alignment rules, read [references/hub-v2-mcp-alignment.md](references/hub-v2-mcp-alignment.md) before editing.

## Workflow

### 1. Inventory First

- Inspect existing tool handlers, schemas, registration, catalog entries, README/docs, and tests before modifying code.
- Use `rg` to find the current tool name and related route before adding a new tool.
- If a handler already exists under another name, do not duplicate it; update docs/skills with the real tool name.
- If a backend Token route exists but no MCP tool is registered, decide whether the task asks to expose it or only document the gap.

### 2. Implement Thin MCP Tools

- Keep tool handlers thin: schema, argument mapping, service/client call, structured result.
- Put reusable validation, redaction, audit, file, path, and workflow logic in shared helpers or services.
- For write or execute tools, support preview/dry-run behavior and require explicit confirmation plus the relevant environment policy flag.
- Never ask users to paste tokens, Authorization headers, cookies, or local secret file contents into chat or tool arguments.
- Do not expose arbitrary shell execution, arbitrary file writes, unsafe path traversal, raw `.env`, private keys, or unbounded logs.

### 3. Register Everywhere

- Register new MCP tools in the relevant domain index and in `packages/mcp-server/src/tools/index.ts` if the domain aggregate requires it.
- Add the tool to `packages/mcp-server/src/tools/tool-catalog.ts` with the correct `riskLevel`, description, and capability grouping.
- Use snake_case tool names only: `ngm_` for local ng-manager tools and `hub_v2_` for Hub V2 tools. Do not add dotted, camelCase, `hubv2_`, `sl_hub_v2_`, or other legacy aliases.
- Confirm `ngm mcp doctor` capability summaries still include the domain after the change when relevant.

### 4. Align Docs And Skills

- Update `packages/mcp-server/README.md` when the public MCP tool inventory changes.
- Update Hub V2 docs when Hub V2 Personal/Project Token routes or MCP-exposed capabilities change.
- Keep `apps/site/docs/hub-v2/skills/hub-v2-api/SKILL.md` and `references/api.md` limited to actual MCP tools. If a Token route exists but no MCP tool exists, document it as unavailable instead of teaching an Agent to improvise.
- Keep `hub-v2-docs` focused on document MCP tools and do not teach direct REST calls from that skill.

### 5. Test Narrowly

- Add or update MCP tests for registration, preview behavior, confirmed request method/path/body, blocked write policy, and catalog inventory.
- If a Hub V2 backend route is added, add a route/service test in `apps/hub-v2/server`.
- Prefer the narrowest useful commands:
  - `npm run build -w @yinuo-ngm/mcp-server`
  - `npm test -w @yinuo-ngm/mcp-server`
  - Hub V2 server scoped build/test when server routes changed.

## Decision Rules

- If the user asks for an inventory report, do not add new capability unless a handler is already implemented but unregistered or the omission is clearly accidental.
- If the user asks to expose an existing backend route through MCP, add the smallest adapter needed and update docs/skills to use the new tool name.
- If the user asks for a missing backend capability and MCP tool, implement the backend route first, then the MCP adapter, then docs/tests.
- If a requested operation would create arbitrary execution, arbitrary source writes, remote control, token exposure, or unsafe local filesystem access, stop and ask for an explicit design decision.

## Reply Rules

- Report changed files, implemented behavior, docs alignment, and verification commands in Chinese.
- Clearly separate implemented MCP tools from Token API routes that are documented but not MCP-exposed.
- Do not claim a tool exists unless it is registered and visible through the MCP tool list/catalog.
