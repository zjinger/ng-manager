---
name: ngm-workspace
description: Use this skill when the user asks about the ng-manager workspace, monorepo structure, packages/*, webapp, packages/cli, packages/mcp-server, MCP tools, CodeGraph availability, API debugging, design handoff, local code context, package metadata, or how local ng-manager capabilities are organized.
---

# NGM Workspace

## Purpose

This skill helps agents understand the local ng-manager workspace and route work across local capability areas.

Use this skill for workspace context, capability discovery, package metadata, MCP tool exposure, and local code context. It is broader than code analysis: it covers the local monorepo layout, applications, packages, and local engineering capabilities that ng-manager exposes to agents.

This skill is about local workspace understanding, not Hub V2 collaboration data.

## Use This Skill For

- Understanding the ng-manager monorepo structure
- Mapping `packages/*`, `webapp`, `packages/cli`, `packages/server`, `desktop`, and `packages/mcp-server`
- Listing packages and reading package metadata
- Understanding MCP Server tool exposure
- Checking which local capability domain owns a task
- Inspecting CodeGraph availability or code-context workflows
- API debugging capability analysis
- Design handoff capability analysis
- Repository navigation and local workspace context
- Deciding whether package capabilities should be exposed through MCP

## Do Not Use This Skill For

- Hub V2 issue data
- Hub V2 RD workflow records
- Hub V2 project documents
- Project Token document read/write
- Collaboration records

Use `hub-v2-api` or `hub-v2-docs` for those tasks.

## Related NGM Local Skills

Use this skill with more specific local skills when needed:

- `ngm-project`: local project entries, `package.json` scripts, and task status
- `ngm-runtime`: Node runtime, Node version, and project runtime resolution
- `ngm-nginx`: local Nginx status, server blocks, proxy rules, and config validation

## Preferred MCP Tool Domains

When available, prefer MCP tools with names like:

```text
ngm.capabilities
ngm.routeTask
ngm.workspace.summary
ngm.workspace.listPackages
ngm.workspace.getPackage
ngm.workspace.mcpTools
ngm.workspace.capabilityMap
ngm.project.list
ngm.project.get
ngm.runtime.list
ngm.nginx.status
```

If exact tool names differ, choose tools whose descriptions mention:

```text
workspace
monorepo
package
mcp
tool
capability
codegraph
api debugging
design handoff
local context
```

## CodeGraph Guidance

CodeGraph is a code context provider, not the only workspace context source.

If CodeGraph tools are available in the MCP client, use them for symbol lookup, references, call graphs, and impact analysis before manually reading many files.

If CodeGraph is not available, use workspace and package metadata tools first, then inspect repository files directly.

Do not assume ng-manager's MCP server directly exposes a CodeGraph database unless a matching MCP tool is listed.

## MCP Exposure Guidance

When analyzing whether a package capability should be exposed through MCP, check:

1. Is the capability useful to AI agents?
2. Is it read-only or execution-capable?
3. Does it require explicit user confirmation?
4. Could it expose secrets, local credentials, or sensitive files?
5. Is the capability generic across local projects?
6. Does it belong in `packages/mcp-server`, or should it remain internal?
7. Is there already a stable core service or CLI command to adapt?
8. Is the output structured, small, and agent-friendly?

Prefer exposing stable, structured, read-only capabilities first.

Examples of good read-only MCP candidates:

- list workspace packages
- read package metadata
- list MCP capabilities
- list project scripts
- resolve runtime
- inspect Nginx rules
- inspect local API debugging collections
- summarize design handoff package boundaries

Examples requiring caution:

- run scripts
- stop processes
- modify runtime binding
- rewrite Nginx config
- delete files
- write `.env`
- execute arbitrary shell commands

## Recommended Workflow

### Understand a workspace task

1. Call capability discovery if available.
2. Route the task to workspace, project, runtime, nginx, or Hub V2 skills.
3. Use workspace/package metadata before broad manual file reads.
4. Use CodeGraph for symbol-level questions when available.
5. Summarize the relevant local capability boundary and next action.

### Analyze MCP coverage

1. List current MCP tools.
2. Map tools to local capability domains.
3. Identify missing high-value read-only tools.
4. Identify risky write or execution tools.
5. Recommend phased exposure.

## Safety Rules

- Do not expose secrets or `.env` values.
- Do not recommend arbitrary shell execution as a default MCP capability.
- Prefer read-only tools first.
- Require explicit confirmation for write or execution tools.
- Keep MCP outputs structured and small.
