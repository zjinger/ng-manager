---
name: sprite-sync
description: >
  Sync Sprite Generator assets to an ng-manager managed frontend project.
  Use when user says "update sprites for XXX project", "sync sprites to project", "download sprites".
  Only uses ng-manager MCP server tools (ngm_project_* and design_handoff_*), never calls Sprite Generator API directly.
---

# Sprite Sync Skill

## When to use

- "Update/sync sprites for XXX project"
- "Download sprites to XXX project"
- "Sync sprite assets to frontend project"

## Tools

| Tool | Purpose |
|------|---------|
| `ngm_project_find` | Search local projects by keyword |
| `ngm_project_list` | List all local projects (fallback) |
| `ngm_project_get` | Get project details (root, framework) |
| `design_handoff_list_projects` | List Sprite Generator projects |
| `design_handoff_download_all_sprites` | Download all sprites as ZIP |

## Workflow

Show intermediate results at every step. Wait for user confirmation before proceeding.

### Step 1: Find local project

Extract keyword from user input. Call `ngm_project_find(query: "keyword")`.

- **1 result** — show name, path, framework; ask user to confirm
- **Multiple results** — list all (numbered); let user choose
- **No results** — call `ngm_project_list`, list all projects; let user choose

After confirmation, call `ngm_project_get(projectId)` to get `root`, `framework`, `name`.

### Step 2: Find sprite project

Call `design_handoff_list_projects` to get all Sprite Generator projects.

**Match by name (priority order):**

1. **Exact** — sprite project `name` === local project `name`
2. **Contains** — one `name` contains the other
3. **Fuzzy** — user keyword is substring of sprite project `name`

- **1 match** — show name, ID; ask user to confirm
- **Multiple matches** — list all; let user choose
- **No match** — list all sprite projects; let user choose

Record the confirmed sprite `projectId`.

### Step 3: Determine output directory

Recommend based on local project `framework`:

| Framework | Recommended path |
|-----------|-----------------|
| Angular | `{root}/src/assets/sprites/` |
| Vue | `{root}/public/sprites/` |
| React | `{root}/public/sprites/` |
| Other | `{root}/assets/sprites/` |

Show recommendation, ask user to confirm or change.

### Step 4: Execute sync

**4.1 Check target directory**

- Does not exist — ask user whether to create it
- Exists — check for existing files

**4.2 Check file conflicts**

List existing files in target directory (if any):

```
Target directory already contains:
- 10-10.png
- 10-10.css
- 20-20.png
- 20-20.css
Overwrite?
```

- User confirms overwrite — continue
- User declines — abort, suggest manual cleanup or different directory

**4.3 Download and extract**

1. Create temp directory (system temp, subfolder `sprite-sync-{timestamp}`)
2. Call `design_handoff_download_all_sprites(projectId: spriteProjectId, outputDir: tempDir)`
3. Extract ZIP to target directory
4. Delete temp directory
5. Report results (group count, file count, total size)

**4.4 Report summary**

```
Sync complete!
- Sprite project: Tianjin Port Tugboat System
- Target dir: D:/pro/tjg/src/assets/sprites/
- Groups: 5 (10-10, 12-12, 16-16, 20-20, 36-36)
- Files: 10 (5 PNG + 5 CSS)
- Total size: 128.5 KB
```

## Error handling

| Scenario | Action |
|----------|--------|
| Sprite Generator unreachable | Tell user to check service at `SPRITE_GEN_API_URL` |
| `design_handoff_list_projects` returns empty | Tell user to create a project in Sprite Generator first |
| Download fails | Show error, suggest checking if sprites have been generated |
| ZIP extraction fails | Keep ZIP in target dir, tell user to extract manually |
| No write permission on target dir | Tell user to check permissions or choose another directory |

## Rules

- Always show results and wait for confirmation at every step
- Never skip confirmation
- If user says "cancel" or "stop" at any point, abort immediately
- Clean up temp files after sync (success or failure)
- File overwrite during extraction must be confirmed by user, never silent
