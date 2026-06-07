# @yinuo-ngm/mcp-server

Local MCP Server for ng-manager.

Provides MCP tools that expose ng-manager capabilities to AI Agents such as Codex, OpenCode, Claude Code, Cursor, and other MCP-compatible clients.

The MCP server is an adapter layer only. Business logic belongs in `packages/core`.

---

## Architecture

```text
AI Agent
    ↓
MCP Client
    ↓
packages/mcp-server
    ↓
ToolContext.services
    ↓
packages/core
    ↓
Local Services
```

Principles:

- MCP tools are thin adapters
- No duplicated business logic
- No Fastify dependency
- No Electron dependency
- Reuse the same core services as CLI, UI, and Local Server

---

## Quick Start

Repository root:

```bash
npm run mcp:dev
npm run mcp:build
npm run mcp:start
```

Workspace commands:

```bash
npm run dev -w @yinuo-ngm/mcp-server
npm run build -w @yinuo-ngm/mcp-server
npm run start -w @yinuo-ngm/mcp-server
```

CLI:

```bash
ngm mcp
```

Diagnostics:

```bash
ngm mcp doctor
```

---

## Environment Variables

| Variable | Description |
|-----------|-------------|
| NGM_DATA_DIR | ng-manager data directory |
| NGM_MCP_ALLOW_WRITE | Enable write tools |
| NGM_MCP_ALLOW_EXECUTE | Enable execute tools |
| NGM_MCP_ALLOW_DANGEROUS | Enable dangerous tools |
| NGM_MCP_ALLOW_HUB | Enable Hub V2 write operations |
| NGM_MCP_MAX_RESULT_CHARS | MCP response size limit |

---

## MCP Client Example

```json
{
  "mcpServers": {
    "ng-manager": {
      "command": "node",
      "args": [
        "packages/mcp-server/lib/index.js"
      ],
      "env": {
        "NGM_DATA_DIR": "~/.ng-manager"
      }
    }
  }
}
```

---

## Tool Categories

### Workspace

- Workspace discovery
- Package metadata
- Capability routing
- Context generation

### Project

- Project metadata
- Package.json access
- Script discovery
- Task status and logs

### Runtime

- Node runtime discovery
- Runtime resolution
- Project runtime configuration

### Nginx

- Status inspection
- Configuration validation
- Proxy management

### Git

- Status and diff
- Commit message generation
- Review assistance

### Frontend Workflow

- Standards validation
- Review scanning
- Task planning
- Delivery reports

### Hub V2

- Documents
- Issues
- RD workflows
- File uploads

---

## Safety Model

Risk levels:

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

Write and execute operations require:

- `confirm=true`
- Matching environment flag enabled
- Policy validation passed

The MCP server does not provide:

- Arbitrary shell execution
- Arbitrary file system access
- System environment mutation
- Remote client command execution

---

## Documentation

Detailed documentation is maintained under:

```text
packages/mcp-server/docs/
```

Recommended structure:

```text
docs/
├─ architecture.md
├─ security.md
├─ configuration.md
└─ tools/
   ├─ ngm-workspace.md
   ├─ ngm-project.md
   ├─ ngm-runtime.md
   ├─ ngm-nginx.md
   ├─ ngm-git.md
   └─ hub-v2.md
```

---

## Design Goal

ng-manager MCP Server is the unified AI integration layer for local-first engineering workflows.

```text
AI Agent
    ↓
MCP
    ↓
ng-manager Core
    ↓
Local Control Plane
```
