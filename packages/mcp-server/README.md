# @yinuo-ngm/mcp-server

Local MCP stdio server for ng-manager core capabilities.

This package is an AI Agent adapter layer. It is not a business core, not a Fastify replacement, not an Electron lifecycle manager, and not a general shell execution entrypoint.

## Positioning

The intended boundary is:

```text
MCP client -> packages/mcp-server -> ToolContext.services -> packages/core
```

MCP tools must not call the local Fastify HTTP API. HTTP routes, Electron IPC, CLI commands, and MCP tools should all adapt the same core services.

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

This MVP only registers read tools. It does not implement arbitrary shell execution, task start/stop/restart, git pull/checkout/commit/reset, proxy reload, runtime install/remove, file deletion, or system environment mutation.

## Environment

```text
NGM_DATA_DIR                 ng-manager data directory. Defaults to ~/.ng-manager.
NGM_WORKSPACE_ROOT           Optional workspace hint. Defaults to process.cwd().
NGM_MCP_ALLOW_WRITE          Future policy flag for write tools. Defaults to false.
NGM_MCP_ALLOW_EXECUTE        Future policy flag for execute tools. Defaults to false.
NGM_MCP_ALLOW_DANGEROUS      Future policy flag for dangerous tools. Defaults to false.
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
