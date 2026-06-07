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
ngm.project.list
ngm.project.find
ngm.project.get
ngm.project.readPackageJson
ngm.project.getScripts
ngm_project_run_script
ngm_project_stop
ngm_project_list_tasks
ngm_project_task_status
ngm_project_task_logs
ngm_project_port_check
ngm_project_health_check
ngm.task.list
ngm.task.getStatus
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
6. Preview `ngm_project_run_script`
7. Execute only after explicit user confirmation and MCP execute policy

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
5. Preview `ngm_project_run_script`
6. Execute with `confirm: true` only after user confirmation
```

Confirmed script execution requires MCP execute policy, such as `NGM_MCP_ALLOW_EXECUTE=true`, in the MCP server environment.

When execution is confirmed, `ngm_project_run_script` should run through the active local ng-manager server control plane, not through a separate standalone task process. This keeps the UI task state, running count, WebSocket events, task status, and log tail aligned with the action triggered by the agent. Inspect `launch.status` and `launch.message` before telling the user whether startup is ready, still running, failed, or exited.

After a project is started, use the observation tools to close the loop:

```text
1. `ngm_project_task_status` to check shared server runtime state
2. `ngm_project_task_logs` to inspect limited, redacted recent logs
3. `ngm_project_port_check` for one expected local port when known
4. `ngm_project_health_check` for a local URL detected from task runtime or supplied by the user
```

If the local ng-manager server is unavailable, state that task runtime/log observation requires `ngm server` or `ngm ui`; do not ask MCP to start a second server implicitly.

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

- Do not run scripts unless the user explicitly asks and the controlled tool has previewed the operation.
- Do not stop processes unless explicitly requested and the controlled tool has previewed the target.
- Use `ngm_project_run_script` only for scripts present in the project's `package.json`; never pass arbitrary shell.
- Use `ngm_project_stop` only for ng-manager managed task ids or matching managed project tasks; never kill arbitrary PID.
- Prefer local-server task status/log results after starting or stopping, because the UI reads the same server-side task runtime.
- Use `ngm_project_task_logs` only for limited tails; never request or return full log files.
- Use `ngm_project_port_check` for a single local host/port only; never scan port ranges.
- Use `ngm_project_health_check` only for local URLs or URLs detected from managed task runtime.
- Do not modify `package.json` unless explicitly requested.
- Prefer read-only inspection first.
- When showing environment variables, redact secrets and tokens.
- Avoid exposing absolute sensitive paths unless necessary.
