---
name: ngm-project
description: Use this skill when the user asks about local project management in ng-manager, Angular/Vue/Node projects, package.json scripts, npm/pnpm/yarn tasks, starting or stopping projects, project process status, WebApp project configuration, project workspace paths, or packages related to project management.
---

# NGM Project

## Purpose

This skill describes how AI agents should handle ng-manager local project management tasks.

Use this skill when the task involves local developer projects managed by ng-manager, especially Angular, Vue, Node, Electron, or other frontend/backend projects.

This skill is about local engineering control, not Hub V2 collaboration data.

## Use This Skill For

- Listing local projects
- Finding a project by name or path
- Reading project configuration
- Reading `package.json`
- Listing `package.json` scripts
- Running npm / pnpm / yarn scripts
- Starting a local project
- Stopping a local project
- Restarting a local project
- Checking project process status
- Checking project working directory
- Understanding WebApp project management behavior
- Understanding packages related to project management

## Do Not Use This Skill For

- Hub V2 issue data
- Hub V2 RD workflow records
- Hub V2 project documents
- Project Token document read/write
- Collaboration platform records

Use `hub-v2-api` or `hub-v2-docs` for those tasks.

## Preferred MCP Tool Domains

When available, prefer MCP tools with names like:

```text
ngm_project_list
ngm_project_find
ngm_project_get
ngm_project_read_package_json
ngm_project_list_scripts
ngm_project_run_script
ngm_project_stop
ngm_project_restart
ngm_project_status
project_list
project_find
project_read_package_json
project_run_package_script
project_stop_process
webapp_list
webapp_start
webapp_stop
```

If exact tool names differ, choose tools whose descriptions mention:

```text
project
package.json
scripts
npm
pnpm
yarn
process
webapp
local workspace
```

## Recommended Workflow

### Inspect project before execution

For project startup tasks:

1. Find the project
2. Read its configuration
3. Read `package.json`
4. List available scripts
5. Resolve runtime if needed
6. Run the selected script only after the user explicitly requests execution

### Example: Start a project

User:

```text
帮我启动 hub-v2 web
```

Recommended steps:

```text
1. Find the local project entry for hub-v2 web
2. Read package.json
3. Identify the correct script, such as dev/start
4. Check runtime requirements if available
5. Run the script through ng-manager MCP tools
```

### Example: Analyze package scripts

User:

```text
帮我看这个项目有哪些可运行命令
```

Recommended steps:

```text
1. Locate project
2. Read package.json
3. Return scripts with concise explanation
4. Do not execute scripts unless explicitly requested
```

## Safety Rules

- Do not run scripts unless the user explicitly asks.
- Do not stop or restart processes unless explicitly requested.
- Do not modify `package.json` unless explicitly requested.
- Prefer read-only inspection first.
- When showing environment variables, redact secrets and tokens.
- Avoid exposing absolute sensitive paths unless necessary.