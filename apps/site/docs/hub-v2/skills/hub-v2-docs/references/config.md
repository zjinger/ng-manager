# Hub V2 MCP Config

Use one unified ng-manager MCP server:

```toml
[mcp_servers.ngManager]
command = "ngm"
args = ["mcp"]
```

The MCP server reads Hub V2 access settings from environment variables or local config. Prefer the new `HUB_V2_` prefix:

```text
HUB_V2_BASE_URL=http://127.0.0.1:7001
HUB_V2_PROJECT_KEY=demo
HUB_V2_PROJECT_TOKEN=project-token-for-reads
HUB_V2_PERSONAL_TOKEN=personal-token-for-writes
```

Compatibility prefixes are accepted for migration:

```text
SL_HUB_V2_*
NGM_HUB_V2_*
```

Local config files may use top-level keys or dedicated objects named `hubV2`, `slHubV2`, or `sl_hub_v2`.

Single project:

```json
{
  "base_url": "http://127.0.0.1:7001",
  "project_key": "demo",
  "project_name": "Demo",
  "project_token": "project-token-for-reads",
  "personal_token": "personal-token-for-writes",
  "source": "agent"
}
```

Multiple projects:

```json
{
  "base_url": "http://127.0.0.1:7001",
  "default_project": "demo",
  "projects": {
    "demo": {
      "project_key": "demo",
      "project_name": "Demo",
      "project_token": "project-token-for-reads",
      "personal_token": "personal-token-for-writes"
    }
  }
}
```

Security rules:

- Never place tokens in skill files.
- Never pass tokens as MCP tool arguments.
- Do not print full token values in logs or replies.
- Use Project Token for document reads.
