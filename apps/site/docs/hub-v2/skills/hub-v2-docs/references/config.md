# SL Hub V2 Shared Token Config

Use one shared config file for `$hub-v2-docs` and `$hub-v2-api`.

Recommended path:

```text
%USERPROFILE%\.sl-hub-v2.json
```

The same file supplies `base_url`, `project_key`, Project Token, and Personal Token for both document operations and Issue/RD API operations.

## Single Project

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

## Multiple Projects

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
    }
  }
}
```

Select a project:

```bash
python scripts/hub_v2_docs.py --project demo list
```

## Claude Code Settings

Use `env` when you want Claude Code to inject values:

```json
{
  "env": {
    "SL_HUB_V2_BASE_URL": "http://192.168.1.31:7008",
    "SL_HUB_V2_PROJECT_KEY": "prj_xxxxxxxxxxxxxxxxxxxxxxxx",
    "SL_HUB_V2_PROJECT_NAME": "示例项目",
    "SL_HUB_V2_PROJECT_TOKEN": "ngm_ptk_xxx",
    "SL_HUB_V2_PERSONAL_TOKEN": "ngm_uptk_xxx",
    "SL_HUB_V2_SOURCE": "claude-code"
  }
}
```

Dedicated object form is also accepted:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "ngm_ptk_demo",
        "personalToken": "ngm_uptk_demo",
        "source": "claude-code"
      }
    }
  }
}
```

`sl_hub_v2` with snake case keys is also supported.

## OpenCode Settings

OpenCode users can keep using the shared `%USERPROFILE%\.sl-hub-v2.json` file, or place the same dedicated object in project/user OpenCode config.

Project config:

```text
<workspace>\opencode.json
<workspace>\opencode.jsonc
```

User config:

```text
%USERPROFILE%\.config\opencode\opencode.json
%USERPROFILE%\.config\opencode\opencode.jsonc
%APPDATA%\opencode\opencode.json
%APPDATA%\opencode\opencode.jsonc
```

OpenCode config example:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "ngm_ptk_demo",
        "personalToken": "ngm_uptk_demo",
        "source": "opencode"
      }
    }
  }
}
```

The scripts also accept `OPENCODE_CONFIG=<path>` and `OPENCODE_CONFIG_CONTENT=<json-or-jsonc>`. OpenCode sources are merged in this order: user config, custom config, nearest project config, then inline content.

## Config Search Order

1. `--config <path>`
2. `SL_HUB_V2_CONFIG`
3. `%USERPROFILE%\.openclaw\sl-hub-v2.json`
4. `%USERPROFILE%\.codex\sl-hub-v2.json`
5. OpenCode merged config:
   - `%APPDATA%\opencode\opencode.json` or `.jsonc`
   - `%USERPROFILE%\.config\opencode\opencode.json` or `.jsonc`
   - `OPENCODE_CONFIG`
   - `<workspace>\opencode.json` or `<workspace>\opencode.jsonc`, walking up to the git root.
   - `OPENCODE_CONFIG_CONTENT`
6. `<workspace>\.claude\settings.local.json`
7. `<workspace>\.claude\settings.json`
8. `%USERPROFILE%\.claude\settings.json`
9. `%USERPROFILE%\.sl-hub-v2.json`

## Environment Variables

Environment variables override config file values:

```text
SL_HUB_V2_CONFIG
SL_HUB_V2_BASE_URL
SL_HUB_V2_PROJECT
SL_HUB_V2_PROJECT_KEY
SL_HUB_V2_PROJECT_NAME
SL_HUB_V2_PROJECT_TOKEN
SL_HUB_V2_PERSONAL_TOKEN
SL_HUB_V2_SOURCE
OPENCODE_CONFIG
OPENCODE_CONFIG_CONTENT
```

## Config Keys

Snake case and camel case are both supported:

| Snake case | Camel case | Purpose |
|---|---|---|
| `base_url` | `baseUrl` | SL Hub V2 host |
| `project_key` | `projectKey` | SL Hub V2 project key |
| `project_name` | `projectName` | Optional human-readable project display name |
| `project_token` | `projectToken` | Project Token for reads |
| `personal_token` | `personalToken` | Personal Token for writes |
| `source` | `source` | Audit source metadata |

Multi-project keys:

| Snake case | Camel case | Purpose |
|---|---|---|
| `default_project` | `defaultProject` | Default project alias |
| `projects` | `projects` | Map or list of project configs |
