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

Write tools are registered only for scoped Hub V2 Personal Token workflows that require explicit tool confirmation when implemented. The server does not implement arbitrary shell execution, task start/stop/restart, git pull/checkout/commit/reset, proxy reload, runtime install/remove, file deletion, system environment mutation, or remote client command execution.

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

## Hub V2 Agent Connection Config

Hub V2 tools read token configuration from MCP server configuration only. Tool schemas do not accept token arguments.

Configuration priority:

```text
tool args project/projectKey
HUB_V2_* environment variables
HUB_V2_CONFIG / NGM_HUB_V2_CONFIG / SL_HUB_V2_CONFIG explicit config path
~/.ng-manager/agent-connections.json
legacy Hub V2 config files
```

Environment variables are the preferred override for CI, local debugging, and MCP client injection:

```bash
HUB_V2_BASE_URL=http://127.0.0.1:7001
HUB_V2_PROJECT_KEY=demo
HUB_V2_PROJECT_TOKEN=project-token-for-reads
HUB_V2_PERSONAL_TOKEN=personal-token-for-writes
```

For persistent local configuration, use `~/.ng-manager/agent-connections.json`:

```json
{
  "version": 1,
  "hubV2": {
    "defaultProject": "ng-manager",
    "projects": {
      "ng-manager": {
        "baseUrl": "http://127.0.0.1:7001",
        "projectKey": "ng-manager",
        "projectToken": "xxx",
        "personalToken": "yyy",
        "source": "ng-manager-ui"
      }
    }
  }
}
```

Legacy files such as `~/.ng-manager/hub-v2.json`, `~/.sl-hub-v2.json`, `~/.codex/sl-hub-v2.json`, `~/.openclaw/sl-hub-v2.json`, and Claude/OpenCode shaped objects remain supported during migration.

Security rules:

```text
Do not commit token config files.
Do not pass tokens in MCP tool arguments.
Do not print full tokens in logs, summaries, API responses, or Agent replies.
Use Project Token for Hub V2 read tools.
Use Personal Token only for confirmed write tools.
```

Launch with:

```bash
ngm mcp
```

## Tools

Project:

```text
ngm.project.list
ngm.project.get
ngm.project.getScripts
```

Task:

```text
ngm.task.list
ngm.task.getStatus
```

Log:

```text
ngm.log.tail
ngm.log.search
```

Git:

```text
ngm.git.status
ngm.git.diff
```

The Git tools are registered in this MVP but return a clear "not implemented in core yet" error through the Git service stub. A future phase should add a read-only Git service to `packages/core` first.

Runtime:

```text
ngm.runtime.list
ngm.runtime.resolveForProject
```

Proxy:

```text
ngm.proxy.list
ngm.proxy.validate
```

In this package, "proxy" means ng-manager's current Nginx/proxy management domain, not the operating system global proxy.

Hub V2:

```text
hub_v2_projects_list
hub_v2_projects_get
hub_v2_docs_list
hub_v2_docs_get
hub_v2_docs_get_by_slug
hub_v2_issues_list
hub_v2_issues_get
hub_v2_issues_create
hub_v2_issues_comment
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

Hub V2 reads use Project Token configuration and writes use Personal Token configuration. `hub_v2_upload_markdown_image` uploads image files for Markdown bodies and returns a snippet that can be inserted into RD descriptions, RD stage-task descriptions, Issue descriptions, or Issue comments before calling the matching create/comment tool. Prefer `HUB_V2_*` environment variables for temporary overrides and `~/.ng-manager/agent-connections.json` for persistent local configuration; legacy `SL_HUB_V2_*`, `NGM_HUB_V2_*`, and old config files are accepted during migration.


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
