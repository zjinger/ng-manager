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
  "project_name": "示例项目",
  "project_token": "ngm_ptk_xxx",
  "personal_token": "ngm_uptk_xxx",
  "source": "openclaw"
}
```

Use Project Token for reads and Personal Token for writes.

Multiple projects are supported. Use a shared `base_url`, set `default_project`, then add project-specific tokens:

```json
{
  "base_url": "http://192.168.1.31:7008",
  "default_project": "demo",
  "projects": {
    "demo": {
      "project_key": "prj_demo",
      "project_name": "演示项目",
      "project_token": "ngm_ptk_demo",
      "personal_token": "ngm_uptk_demo",
      "source": "openclaw"
    },
    "ops": {
      "project_key": "prj_ops",
      "project_name": "运维项目",
      "project_token": "ngm_ptk_ops",
      "personal_token": "ngm_uptk_ops",
      "source": "openclaw"
    }
  }
}
```

Select a project:

```bash
python scripts/hub_v2_docs.py --project demo list
```

List configured aliases without exposing token values:

```bash
python scripts/hub_v2_docs.py projects
```

## Recommended Claude Code Config

Claude Code supports settings files such as project `.claude/settings.json`, local project `.claude/settings.local.json`, and user `~/.claude/settings.json`. Put Hub V2 values in the `env` object when you want Claude Code to inject them into tool/script execution.

Project-local example:

```text
<workspace>\.claude\settings.local.json
```

```json
{
  "env": {
    "HUB_V2_BASE_URL": "http://192.168.1.31:7008",
    "HUB_V2_PROJECT_KEY": "prj_xxxxxxxxxxxxxxxxxxxxxxxx",
    "HUB_V2_PROJECT_NAME": "示例项目",
    "HUB_V2_PROJECT_TOKEN": "ngm_ptk_xxx",
    "HUB_V2_PERSONAL_TOKEN": "ngm_uptk_xxx",
    "HUB_V2_DOCS_SOURCE": "claude-code"
  }
}
```

The helper script can also read these Claude Code settings files directly. If you prefer not to mix token values into `env`, use a dedicated object:

```json
{
  "hubV2Docs": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "ngm_ptk_demo",
        "personalToken": "ngm_uptk_demo",
        "source": "claude-code"
      },
      "ops": {
        "projectKey": "prj_ops",
        "projectName": "运维项目",
        "projectToken": "ngm_ptk_ops",
        "personalToken": "ngm_uptk_ops",
        "source": "claude-code"
      }
    }
  }
}
```

`hub_v2_docs` with snake case keys is also supported.

## Alternative Config Paths

The helper script checks config in this order:

1. `--config <path>`
2. `HUB_V2_DOCS_CONFIG`
3. `%USERPROFILE%\.openclaw\hub-v2-docs.json`
4. `%USERPROFILE%\.codex\hub-v2-docs.json`
5. `<workspace>\.claude\settings.local.json`
6. `<workspace>\.claude\settings.json`
7. `%USERPROFILE%\.claude\settings.json`
8. `%USERPROFILE%\.hub-v2-docs.json`

## Environment Variables

Environment variables override config file values:

```text
HUB_V2_BASE_URL
HUB_V2_PROJECT
HUB_V2_PROJECT_KEY
HUB_V2_PROJECT_NAME
HUB_V2_PROJECT_TOKEN
HUB_V2_PERSONAL_TOKEN
HUB_V2_DOCS_CONFIG
HUB_V2_DOCS_SOURCE
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
| `project_name` | `projectName` | Optional human-readable project display name |
| `project_token` | `projectToken` | Project Token for reads |
| `personal_token` | `personalToken` | Personal Token for writes |
| `source` | `source` | Audit source metadata |

Multi-project keys:

| Snake case | Camel case | Purpose |
|---|---|---|
| `default_project` | `defaultProject` | Default project alias |
| `projects` | `projects` | Map or list of project configs |

Project config entries support the same `project_key`, `project_name`, `project_token`, `personal_token`, `base_url`, and `source` keys. Project-level values override global values. `project_name` is display-only; API calls still use `project_key`.

Claude Code `env` key mapping:

| Claude Code env key | Config key |
|---|---|
| `HUB_V2_BASE_URL` | `base_url` |
| `HUB_V2_PROJECT` | selected project alias |
| `HUB_V2_PROJECT_KEY` | `project_key` |
| `HUB_V2_PROJECT_NAME` | `project_name` |
| `HUB_V2_PROJECT_TOKEN` | `project_token` |
| `HUB_V2_PERSONAL_TOKEN` | `personal_token` |
| `HUB_V2_DOCS_SOURCE` | `source` |

## Security

- Keep the config file outside the repository.
- Limit file access to the current user when possible.
- Rotate tokens if the config file is exposed.
- Do not ask the user to paste full tokens into chat unless absolutely necessary.
