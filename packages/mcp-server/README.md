# @yinuo-ngm/mcp-server

Local MCP stdio server for ng-manager core capabilities.

This package is an AI Agent adapter layer. It is not a business core, not a Fastify replacement, not an Electron lifecycle manager, and not a general shell execution entrypoint.

## Positioning

The intended boundary is:

```text
MCP client -> packages/mcp-server -> ToolContext.services -> packages/core
```

For ng-manager local capabilities, MCP tools should prefer `packages/core`. HTTP routes, Electron IPC, CLI commands, and MCP tools should adapt the same local core services instead of duplicating business logic or calling the local Fastify API.

Hub V2 tools are the exception: they may call the Hub V2 Token HTTP API because that API is the integration contract Hub V2 exposes to AI Agents and other external clients. Those tools must keep token handling inside configuration/client layers and must not accept token values as tool arguments.

The MCP server must not provide arbitrary shell execution, mutate system environment settings, or remotely execute client-side commands.

## Safety

Tools are assigned one risk level:

```text
read
write
execute
dangerous
```

Default policy:

```text
read      allowed
write     blocked
execute   blocked
dangerous blocked
```

Write/execute tools are registered only for scoped, controlled workflows that require explicit tool confirmation and matching environment policy flags. The server does not implement arbitrary shell execution, arbitrary PID control, git pull/checkout/commit/reset, runtime install/remove, file deletion, system environment mutation, or remote client command execution.

## Environment

```text
NGM_DATA_DIR                 ng-manager data directory. Defaults to ~/.ng-manager.
NGM_WORKSPACE_ROOT           Optional workspace hint. Defaults to process.cwd().
NGM_MCP_UPLOAD_ROOT          Optional extra root for Hub V2 markdown image uploads.
NGM_MCP_MAX_UPLOAD_BYTES     Max Hub V2 markdown image upload bytes. Defaults to 5242880.
NGM_MCP_MAX_RESULT_CHARS     Max MCP text result characters. Defaults to 120000.
NGM_MCP_ALLOW_WRITE          Enables confirmed write tools. Defaults to false.
NGM_MCP_ALLOW_EXECUTE        Enables execute tools. Defaults to false.
NGM_MCP_ALLOW_DANGEROUS      Enables dangerous tools. Defaults to false.
```

Project-local frontend standard, review, workflow, and audit files are written only under:

```text
.ng-manager/
```

Audit logs are written as `.ng-manager/audit/mcp-YYYY-MM-DD.jsonl` for write/execute/workflow tool calls. Audit entries are redacted and do not enable business writes by themselves. If audit storage fails, the main tool result stays intact and includes a top-level `auditWarning`.

## Commands

From the repository root:

```bash
npm run mcp:dev
npm run mcp:build
npm run mcp:start
```

Direct workspace commands:

```bash
npm run dev -w @yinuo-ngm/mcp-server
npm run build -w @yinuo-ngm/mcp-server
npm run start -w @yinuo-ngm/mcp-server
```

CLI entrypoint:

```bash
ngm mcp
```

The server uses stdio transport only. It does not listen on an HTTP port, and stdout is reserved for the MCP protocol.

## Diagnostics

`ngm mcp` is a stdio MCP server. Running it directly does not print a banner or prompt. This is expected because stdout is reserved for MCP protocol messages.

Use doctor for static diagnostics:

```bash
ngm mcp doctor
```

`doctor` checks runtime info, config paths, Hub V2 static config, policy flags, and registered tool counts. It does not call Hub V2 APIs, does not execute MCP tool handlers, and never prints token values.

## MCP Client Configuration

Built output:

```json
{
  "mcpServers": {
    "ng-manager": {
      "command": "node",
      "args": [
        "D:/ng-manager/packages/mcp-server/lib/index.js"
      ],
      "env": {
        "NGM_DATA_DIR": "C:/Users/you/.ng-manager",
        "NGM_WORKSPACE_ROOT": "D:/ng-manager",
        "NGM_MCP_ALLOW_WRITE": "false",
        "NGM_MCP_ALLOW_EXECUTE": "false",
        "NGM_MCP_ALLOW_DANGEROUS": "false"
      }
    }
  }
}
```

Development:

```json
{
  "mcpServers": {
    "ng-manager": {
      "command": "npm",
      "args": [
        "run",
        "dev",
        "-w",
        "@yinuo-ngm/mcp-server"
      ],
      "env": {
        "NGM_DATA_DIR": "C:/Users/you/.ng-manager",
        "NGM_WORKSPACE_ROOT": "D:/ng-manager"
      }
    }
  }
}
```

## Hub V2 Config

Hub V2 tools read token configuration from MCP server configuration only. Tool schemas do not accept token arguments.

Configuration priority is:

```text
tool args project/projectKey
HUB_V2_* environment variables
HUB_V2_CONFIG explicit config path
~/.ng-manager/agent-connections.json
```

Use `~/.ng-manager/agent-connections.json` for persistent local configuration, and `HUB_V2_*` environment variables for temporary overrides, tests, or MCP client injection. Treat `agent-connections.json` as a local secret file: do not commit it, do not pass tokens as tool arguments, and do not print full tokens in logs or Agent replies.

## Tools

Tool names below are the exact MCP callable names. Do not rewrite a dotted name into snake_case, and do not rewrite a snake_case name into dotted form.

Naming convention:

```text
ngm.*       ng-manager local read/discovery/context tools.
ngm_*       ng-manager local controlled operation or project runtime diagnostic tools.
hub_v2_*    Hub V2 API/document/RD/issue workflow tools.
```

### `ngm.*` local read/context tools

Discovery and routing:

```text
ngm.capabilities
ngm.routeTask
```

Workspace context:

```text
ngm.workspace.summary
ngm.workspace.listPackages
ngm.workspace.getPackage
ngm.workspace.mcpTools
ngm.workspace.capabilityMap
ngm.workspace.diff
ngm.workspace.applyPatchPreview
```

Project metadata:

```text
ngm.project.list
ngm.project.find
ngm.project.get
ngm.project.getScripts
ngm.project.readPackageJson
```

Task runtime metadata:

```text
ngm.task.list
ngm.task.getStatus
```

Logs:

```text
ngm.log.tail
ngm.log.search
```

Git:

```text
ngm.git.status
ngm.git.diff
ngm.git.validateBranchName
ngm.git.validateCommitMessage
ngm.git.generateCommitMessage
ngm.git.generateReviewSummary
```

Git tools use fixed read-only Git commands only. They do not expose commit, checkout, reset, push, pull, merge, or arbitrary shell execution.

Frontend standards:

```text
ngm.standard.get
ngm.standard.init
ngm.standard.validateProject
ngm.test.detectMissingSpecs
ngm.test.generateSpecPlan
ngm.test.validateNaming
ngm.angular.validateStructure
ngm.angular.validateComponentNaming
ngm.angular.validateComponentBoundary
ngm.review.scanChangedFiles
ngm.review.generateChecklist
ngm.review.detectRisks
ngm.review.generateReport
ngm.workflow.createFrontendTask
ngm.workflow.generateDevPlan
ngm.workflow.advanceStatus
ngm.workflow.validateBeforeWrite
ngm.workflow.validateBeforeCommit
ngm.workflow.generateDeliveryReport
```

`ngm.standard.init`, `ngm.review.generateReport`, and `ngm.workflow.*` write tools support preview by default. Confirmed writes require `confirm=true` and `NGM_MCP_ALLOW_WRITE=true`, and may only create project-local `.ng-manager/**` files. Workflow task files live under `.ng-manager/frontend-tasks/{taskId}/` with `task.json`, `dev-plan.md`, `review-report.md`, and `delivery-report.md`.

`ngm.workspace.applyPatchPreview` never writes files. It rejects forbidden paths such as `node_modules`, `dist`, `build`, `.git`, `.env`, `*.pem`, and `*.key`, rejects binary patches, then returns changed files and added/removed line counts.

Runtime context:

```text
ngm.runtime.current
ngm.runtime.list
ngm.runtime.resolveForProject
ngm.runtime.detectRequirement
```

Nginx context:

```text
ngm.nginx.status
ngm.nginx.servers.list
ngm.nginx.server.get
ngm.nginx.upstreams.list
ngm.nginx.config.validate
ngm.nginx.config.getMain
ngm.nginx.logs.tail
```

Proxy:

```text
ngm.proxy.list
ngm.proxy.validate
```

In this package, "proxy" means ng-manager's current Nginx/proxy management domain, not the operating system global proxy.

### `ngm_*` local project runtime and controlled tools

Project runtime diagnostics are read-only and use the shared local server task state:

```text
ngm_project_list_tasks       read, list ng-manager managed project tasks
ngm_project_task_status      read, inspect one managed task runtime
ngm_project_task_logs        read, limited/redacted log tail for one task/run
ngm_project_port_check       read, check one local host/port
ngm_project_health_check     read, short local HTTP/HTTPS health check
```

Controlled local operations require `confirm=true` plus the matching environment flag:

```text
ngm_project_run_script       execute, preview by default, local server control plane, confirm=true + NGM_MCP_ALLOW_EXECUTE=true to run
ngm_project_stop             execute, preview by default, local server control plane when available, confirm=true + NGM_MCP_ALLOW_EXECUTE=true to stop
ngm_runtime_set_for_project  write, preview by default, local server control plane, confirm=true + NGM_MCP_ALLOW_WRITE=true to save
ngm_nginx_reload             execute, validates config first, confirm=true + NGM_MCP_ALLOW_EXECUTE=true to reload
ngm_nginx_proxy_save         write, preview by default, confirm=true + NGM_MCP_ALLOW_WRITE=true to save
```

Dotted aliases are also registered and should be preferred in new docs and skills:

```text
ngm.project.runScript
ngm.project.stop
ngm.runtime.setForProject
ngm.nginx.reload
ngm.nginx.proxy.save
```

These tools do not accept arbitrary shell commands, arbitrary PIDs, arbitrary file paths, or system-level Node/Nginx mutations. They adapt existing ng-manager core services and return structured operation status (`preview`, `executed`, `blocked`, or `failed`).

`ngm_project_run_script` executes through the currently running local ng-manager server discovered from the runtime lock file or `NGM_MCP_SERVER_URL` / `NGM_SERVER_URL`. This keeps MCP-started task runtime state in the same in-memory task service and WebSocket event stream used by the UI. The tool returns a short launch observation (`launch.status`, `launch.message`, and `launch.runtime`) after starting; long-running dev servers are reported as `running` or `ready`, while early exits are reported as `failed`, `success`, or `stopped`.

Project observation tools (`ngm_project_list_tasks`, `ngm_project_task_status`, `ngm_project_task_logs`) also read the shared local server task runtime instead of creating a second task state center inside the MCP process. If the local server is not running, they return structured `unavailable` results and suggest starting `ngm server` or `ngm ui`; they do not auto-start the server. `ngm_project_task_logs` enforces tail/character limits and redacts token/password/secret/authorization-like values. `ngm_project_port_check` checks one local TCP endpoint only, and `ngm_project_health_check` is limited to local HTTP/HTTPS URLs or URLs detected from managed task runtime.

### `hub_v2_*` Hub V2 tools

```text
hub_v2_projects_list
hub_v2_projects_get
hub_v2_project_members_list
hub_v2_docs_list
hub_v2_docs_get
hub_v2_docs_get_by_slug
hub_v2_issues_list
hub_v2_issues_get
hub_v2_issues_create
hub_v2_issues_comment
hub_v2_issues_assign
hub_v2_issues_update
hub_v2_upload_markdown_image
hub_v2_rd_list
hub_v2_rd_get
hub_v2_rd_stage_tasks_list
hub_v2_rd_create
hub_v2_rd_advance_stage
hub_v2_rd_stage_tasks_create
hub_v2_rd_update_progress
```

Hub V2 reads use Project Token configuration and writes use Personal Token configuration. `hub_v2_upload_markdown_image` uploads image files for Markdown bodies and returns a snippet that can be inserted into RD descriptions, RD stage-task descriptions, Issue descriptions, or Issue comments before calling the matching create/comment tool. Prefer `HUB_V2_*` environment variables for temporary overrides and `~/.ng-manager/agent-connections.json` for persistent local configuration.


## Result Shape

All tools return structured JSON as text content:

```json
{
  "ok": true,
  "tool": "ngm.project.list",
  "data": []
}
```

Errors use:

```json
{
  "ok": false,
  "tool": "ngm.project.get",
  "error": "projectId or projectPath is required"
}
```

## Replacing Stubs

Add missing capabilities to `packages/core` first, then replace the corresponding service inside `ToolContext.services`. MCP tools should remain thin adapters that validate input, enforce policy, call core services, and cap output size.
