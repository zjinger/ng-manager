# Hub V2 Docs External Config

Use external config for `base_url`, `project_key`, Project Token, and Personal Token. Do not store tokens in `SKILL.md`, prompts, screenshots, or repository files.

## Recommended OpenClaw Config

Create:

```text
%USERPROFILE%\.openclaw\hub-v2-docs.json
```

Example:

```json
{
  "base_url": "http://192.168.1.31:7008",
  "project_key": "prj_xxxxxxxxxxxxxxxxxxxxxxxx",
  "project_token": "ngm_ptk_xxx",
  "personal_token": "ngm_uptk_xxx",
  "source": "openclaw"
}
```

Use Project Token for reads and Personal Token for writes.

## Alternative Config Paths

The helper script checks config in this order:

1. `--config <path>`
2. `HUB_V2_DOCS_CONFIG`
3. `%USERPROFILE%\.openclaw\hub-v2-docs.json`
4. `%USERPROFILE%\.codex\hub-v2-docs.json`
5. `%USERPROFILE%\.hub-v2-docs.json`

## Environment Variables

Environment variables override config file values:

```text
HUB_V2_BASE_URL
HUB_V2_PROJECT_KEY
HUB_V2_PROJECT_TOKEN
HUB_V2_PERSONAL_TOKEN
HUB_V2_DOCS_CONFIG
```

## Resolution Priority

1. CLI argument
2. Environment variable
3. Config file
4. Built-in `base_url` default: `http://192.168.1.31:7008`

## Config Keys

Snake case and camel case are both supported:

| Snake case | Camel case | Purpose |
|---|---|---|
| `base_url` | `baseUrl` | Hub V2 host |
| `project_key` | `projectKey` | Hub V2 project key |
| `project_token` | `projectToken` | Project Token for reads |
| `personal_token` | `personalToken` | Personal Token for writes |
| `source` | `source` | Audit source metadata |

## Security

- Keep the config file outside the repository.
- Limit file access to the current user when possible.
- Rotate tokens if the config file is exposed.
- Do not ask the user to paste full tokens into chat unless absolutely necessary.
