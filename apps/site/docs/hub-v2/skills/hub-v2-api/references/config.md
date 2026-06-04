# SL Hub V2 Shared Token Config

Use one shared config file for `$hub-v2-docs` and `$hub-v2-api`:

```text
%USERPROFILE%\.sl-hub-v2.json
```

The same file supplies `base_url`, `project_key`, Project Token, and Personal Token for document operations and Issue/RD API operations.

## Resolution Order

1. Explicit CLI argument.
2. Environment variable.
3. Config file.
4. Built-in default for `base_url` only.

## Config Locations

The scripts check:

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
6. Claude settings in `.claude/settings.local.json`, `.claude/settings.json`, and `%USERPROFILE%\.claude\settings.json`
7. `%USERPROFILE%\.sl-hub-v2.json`

## Single Project Config

```json
{
  "base_url": "http://192.168.1.31:7008",
  "project_key": "prj_xxx",
  "project_name": "示例项目",
  "project_token": "Project Token with read scopes",
  "personal_token": "Personal Token with write scopes",
  "source": "agent"
}
```

CamelCase keys are accepted: `baseUrl`, `projectKey`, `projectName`, `projectToken`, `personalToken`.

## Multiple Projects

```json
{
  "base_url": "http://192.168.1.31:7008",
  "default_project": "demo",
  "projects": {
    "demo": {
      "project_key": "prj_demo",
      "project_name": "演示项目",
      "project_token": "Project Token",
      "personal_token": "Personal Token",
      "source": "agent"
    }
  }
}
```

Select a project with `--project demo` or `SL_HUB_V2_PROJECT=demo`.

## Dedicated Object

Plain top-level keys are preferred. A dedicated object is also accepted:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "Project Token",
        "personalToken": "Personal Token",
        "source": "agent"
      }
    }
  }
}
```

`sl_hub_v2` with snake case keys is also accepted.

## OpenCode Config

OpenCode users can place the dedicated object directly in project or user `opencode.json` / `opencode.jsonc`:

```json
{
  "slHubV2": {
    "baseUrl": "http://192.168.1.31:7008",
    "defaultProject": "demo",
    "projects": {
      "demo": {
        "projectKey": "prj_demo",
        "projectName": "演示项目",
        "projectToken": "Project Token",
        "personalToken": "Personal Token",
        "source": "opencode"
      }
    }
  }
}
```

The scripts also accept `OPENCODE_CONFIG=<path>` and `OPENCODE_CONFIG_CONTENT=<json-or-jsonc>`. OpenCode sources are merged in this order: user config, custom config, nearest project config, then inline content.

## Environment Variables

- `SL_HUB_V2_CONFIG`
- `SL_HUB_V2_BASE_URL`
- `SL_HUB_V2_PROJECT`
- `SL_HUB_V2_PROJECT_KEY`
- `SL_HUB_V2_PROJECT_TOKEN`
- `SL_HUB_V2_PERSONAL_TOKEN`
- `SL_HUB_V2_SOURCE`
- `OPENCODE_CONFIG`
- `OPENCODE_CONFIG_CONTENT`
