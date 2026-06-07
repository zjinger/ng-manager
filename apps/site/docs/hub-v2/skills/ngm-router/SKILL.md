---
name: ngm-router
description: Use this skill first when the user asks about ng-manager, Hub V2, local project management, ng-manager workspace, monorepo structure, packages/* capabilities, MCP tools, ngm CLI, project startup, Node runtime, Nginx, API debugging, design handoff, CodeGraph, local context, issues, RD workflows, or project documents. This skill routes the agent between Hub V2 API/docs skills and NGM local engineering skills.
---

# NGM Router

## Purpose

This skill defines the routing rules for ng-manager related tasks.

ng-manager contains two different capability groups:

1. Hub V2 collaboration platform capabilities
2. NGM local engineering control capabilities

Do not treat all ng-manager tasks as Hub V2 API/docs tasks.

Hub V2 is the internal collaboration platform for issues, RD workflows, project documents, tokens, and collaboration records.

NGM local capabilities are implemented around `packages/*`, `webapp`, `packages/cli`, and `packages/mcp-server`. They manage local developer projects, package scripts, Node runtime, Nginx, API debugging, design handoff, local context, and workspace tooling.

## Core Routing Rule

Use Hub V2 API/docs skills only when the task is about collaboration platform data:

- Issues
- RD workflows
- Project documents
- Project Token
- Document read/write
- Collaboration records
- Hub V2 server/web business logic

Use NGM local skills when the task is about local engineering control:

- Local Angular/Vue/Node project management
- `package.json` scripts
- Start / stop / restart local projects
- Process status
- Node runtime selection
- Node version binding
- Nginx proxy management
- API debugging
- WebApp project management
- `packages/*` capability analysis
- `ngm` CLI
- MCP Server capabilities
- CodeGraph
- Local context
- Workspace structure

## Skill Selection

Use these skills for NGM local capabilities:

- `ngm-project`: local project management and `package.json` scripts
- `ngm-runtime`: Node runtime, Node version, nvm, and project runtime binding
- `ngm-nginx`: local Nginx and proxy management
- `ngm-workspace`: workspace context, packages, CodeGraph availability, MCP tool exposure, API debugging, design handoff, and repository capability mapping

Use these skills for Hub V2 collaboration data:

- `hub-v2-api`
- `hub-v2-docs`

## Recommended Agent Behavior

When the user's request mentions `ng-manager`, first decide whether it is about collaboration data or local engineering control.

If the task involves local execution, local files, local packages, local processes, runtime, Nginx, package scripts, or repository structure, do not answer only from Hub V2 docs. Use NGM local MCP tools or inspect the repository.

If the MCP server exposes capability discovery tools, call them first:

```text
ngm_capabilities
ngm_route_task
```

If those tools are not available, inspect available MCP tools and prefer tools with names or domains related to:

```text
ngm_project
ngm_runtime
ngm_nginx
ngm_workspace
project
runtime
node
nginx
workspace
codegraph
package
```

## Decision Examples

### Example 1

User:

```text
帮我启动 hub-v2 web，并确认 Node runtime 是否正确
```

Correct route:

```text
ngm-project
ngm-runtime
```

Do not route this to `hub-v2-docs`.

### Example 2

User:

```text
帮我查一下某个研发项的需求文档
```

Correct route:

```text
hub-v2-api
hub-v2-docs
```

This is Hub V2 collaboration data.

### Example 3

User:

```text
帮我看 packages/node-runtime 是否应该暴露给 MCP
```

Correct route:

```text
ngm-workspace
ngm-runtime
```

This is repository/package capability analysis.

### Example 4

User:

```text
帮我看本地 Nginx 代理为什么没有生效
```

Correct route:

```text
ngm-nginx
ngm-project
```

This is local engineering control.

## Safety Rules

- Prefer read-only inspection before execution.
- Do not start, stop, or modify local processes unless the user explicitly asks.
- Do not change runtime binding unless the user explicitly asks.
- Do not overwrite Nginx configuration unless the user explicitly asks.
- Never expose secrets, tokens, local credentials, or `.env` values.
- Redact sensitive values when reading environment files.
