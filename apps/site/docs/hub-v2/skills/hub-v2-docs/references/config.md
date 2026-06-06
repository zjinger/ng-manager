# Hub V2 MCP Config

Use one unified ng-manager MCP server:

```toml
[mcp_servers.ngManager]
command = "ngm"
args = ["mcp"]
```

For local diagnostics:

```bash
ngm mcp doctor
```

The MCP server reads Hub V2 access settings from MCP-side configuration only. Tool arguments must not include token values.

Configuration priority:

```text
tool args project/projectKey
HUB_V2_* environment variables
HUB_V2_CONFIG explicit config path
~/.ng-manager/agent-connections.json
```

Persistent local config:

```json
{
  "version": 1,
  "hubV2": {
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "baseUrl": "http://127.0.0.1:7001",
        "projectKey": "demo",
        "projectToken": "project-token-for-reads",
        "personalToken": "personal-token-for-writes",
        "source": "agent"
      }
    }
  }
}
```

Temporary override variables:

```text
HUB_V2_PROJECT=demo
HUB_V2_BASE_URL=http://127.0.0.1:7001
HUB_V2_PROJECT_KEY=demo
HUB_V2_PROJECT_TOKEN=project-token-for-reads
HUB_V2_PERSONAL_TOKEN=personal-token-for-writes
HUB_V2_SOURCE=agent
HUB_V2_CONFIG=C:/Users/you/.ng-manager/agent-connections.json
```

Project selection:

- Use `project` for configured aliases in `hubV2.projects`.
- Use `projectKey` only when the user explicitly gives the Hub V2 project key.
- If multiple projects exist and no `defaultProject` is configured, ask for a project alias.

Security rules:

- Never place tokens in skill files.
- Never ask the user to paste tokens into chat.
- Never pass tokens as MCP tool arguments.
- Do not print full token values in logs or replies.
- Use Project Token for document read tools.
- Treat `~/.ng-manager/agent-connections.json` as a local secret file.
