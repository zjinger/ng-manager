---
name: hub-v2-api
description: Read and operate SL Hub V2 Issue and RD APIs through Project Token and Personal Token. Use when Codex, OpenClaw, or another agent needs to list or inspect test issues, comments, logs, participants, attachments, issue branches, project members, RD stages, RD items, RD logs, RD progress, transition Issue or RD status, add Issue comments, assign or claim issues, manage issue collaborators or branches, advance RD stages, update RD progress, edit RD basic fields, inspect personal token identity/capabilities, or debug SL Hub V2 token scope errors for issues:read, rd:read, issue:comment:write, issue:transition:write, issue:assign:write, issue:branch:write, issue:participant:write, rd:transition:write, and rd:edit:write.
---

# SL Hub V2 API

## Core Rules

- Use Project Token for reads:
  - Issue reads require `issues:read`.
  - RD reads require `rd:read`.
- Use Personal Token for writes:
  - Issue comments require `issue:comment:write`.
  - Issue status transitions require `issue:transition:write`.
  - Issue assign/claim requires `issue:assign:write`.
  - Issue branch operations require `issue:branch:write`.
  - Issue participant operations require `issue:participant:write`.
  - RD transitions, stage advance, and progress require `rd:transition:write`.
  - RD basic edits require `rd:edit:write`.
- Treat `projectKey` as the SL Hub V2 project key in the API path.
- Default `base_url` is `http://192.168.1.31:7008`, but prefer external config.

## Write Safety

- Issue comments may be executed directly when the user gives a clear `issueId` and comment content.
- Issue/RD status transitions and RD stage advance require explicit confirmation:
  - Use the script without `--confirm` first to preview the method, path, body, and required scope.
  - Only add `--confirm` after the user confirms the target action.
- `rd progress-update --progress 100` also requires `--confirm` because it can complete the RD item.
- For ambiguous writes, read the resource detail and personal capabilities first.

## External Config

Use the same external config shape as `$hub-v2-docs` so the user does not need to repeat connection details in each prompt. Prefer one shared config file: `%USERPROFILE%\.sl-hub-v2.json`. Read `references/config.md` when setting up config or diagnosing missing `base_url`, `project_key`, or credentials.

Supported config keys: `base_url`, `project_key`, `project_name`, `project_token`, `personal_token`, `source`, `projects`, and `default_project`. CamelCase variants are also accepted.

OpenCode users may put the same `slHubV2` / `sl_hub_v2` object in project or user `opencode.json` / `opencode.jsonc`, or provide it through `OPENCODE_CONFIG` / `OPENCODE_CONFIG_CONTENT`.

## Script Helper

Prefer MCP tools named `sl_hub_v2.issues_*`, `sl_hub_v2.rd_*`, `sl_hub_v2.me`, and `sl_hub_v2.capabilities` when an SL Hub V2 MCP server is available. Use the script helper as a fallback when MCP tools are not configured in the current agent.

Use `scripts/hub_v2_api.py` for deterministic reads and writes.

Examples:

```bash
python scripts/hub_v2_api.py projects
python scripts/hub_v2_api.py capabilities
python scripts/hub_v2_api.py issue list --page 1 --page-size 20
python scripts/hub_v2_api.py issue comments --issue-id iss_xxx
python scripts/hub_v2_api.py issue comment --issue-id iss_xxx --content "测试评论"
python scripts/hub_v2_api.py issue resolve --issue-id iss_xxx --resolution-summary "已修复"
python scripts/hub_v2_api.py issue resolve --issue-id iss_xxx --resolution-summary "已修复" --confirm
python scripts/hub_v2_api.py rd list --page 1 --page-size 20
python scripts/hub_v2_api.py rd progress --item-id rd_xxx
python scripts/hub_v2_api.py rd progress-update --item-id rd_xxx --progress 40 --note "联调中"
python scripts/hub_v2_api.py rd advance-stage --item-id rd_xxx --stage-id stg_xxx --member-id usr_xxx
python scripts/hub_v2_api.py rd advance-stage --item-id rd_xxx --stage-id stg_xxx --member-id usr_xxx --confirm
```

## Agent Workflow

1. Determine whether the user wants read or write.
2. For reads, use Project Token commands.
3. For writes, inspect `capabilities` first when the user's permission or project membership is uncertain.
4. For transition/advance actions, run the command without `--confirm`, report the preview, and wait for user confirmation.
5. For direct comments, execute only when the issue id and content are explicit.
6. If exact endpoints, request bodies, status rules, or errors are needed, read `references/api.md`.

## References

- Read `references/api.md` for endpoint, scope, request body, and status transition details.
- Read `references/config.md` for config file shapes and resolution order.
