---
name: ngm-runtime
description: Use this skill when the user asks about Node runtime management in ng-manager, Node versions, nvm, packages/node-runtime, packages/node-version, project-specific Node binding, resolving which Node executable should run an Angular/Vue/Node project, npm execution environment, or WebApp runtime configuration.
---

# NGM Runtime

## Purpose

This skill describes how AI agents should handle Node runtime and Node version management in ng-manager.

ng-manager supports local project execution. Different projects may require different Node versions. Runtime selection must be explicit, traceable, and project-aware.

This skill is about local runtime control, not Hub V2 collaboration data.

## Use This Skill For

- Node runtime list
- Node runtime detection
- Node executable resolution
- Node version binding for a project
- `packages/node-runtime`
- `packages/node-version`
- nvm integration
- npm / pnpm / yarn execution environment
- WebApp writing runtime config
- CLI startup chain involving runtime selection
- Diagnosing wrong Node version during project startup

## Do Not Use This Skill For

- Hub V2 project documents
- Hub V2 issues
- RD workflow records
- Collaboration data

Use `hub-v2-api` or `hub-v2-docs` for those tasks.

## Preferred MCP Tool Domains

When available, prefer MCP tools with names like:

```text
ngm_runtime_current
ngm_runtime_list
ngm_runtime_detect_requirement
ngm_runtime_resolve_for_project
ngm_runtime_set_for_project
```

If exact tool names differ, choose tools whose descriptions mention:

```text
node
runtime
version
nvm
executable
npm
pnpm
yarn
project binding
```

## Recommended Workflow

### Diagnose runtime for a project

1. Locate the local project
2. Read project runtime configuration
3. Read `package.json` engines if available
4. Check configured Node runtime
5. Resolve final Node executable
6. Explain which Node will be used and why

### Change runtime binding

Only change runtime binding when explicitly requested.

Before changing:

1. Show current binding
2. Show target binding
3. Explain impact
4. Preview `ngm_runtime_set_for_project`
5. Apply with `confirm: true` only after clear user intent, MCP write policy, and an available local ng-manager server

Confirmed runtime binding changes require MCP write policy, such as `NGM_MCP_ALLOW_WRITE=true`, in the MCP server environment, and should write through the active local ng-manager server control plane so WebApp, CLI, and MCP observe the same project runtime state.

## Runtime Principles

- Runtime resolution should be project-specific.
- Do not assume global `node` is correct.
- Prefer configured project runtime over system default.
- Keep `node-runtime` and `node-version` responsibilities clear:
  - `node-runtime`: concrete runtime installation / executable / runtime metadata
  - `node-version`: version requirement or project binding layer
- WebApp should write or update runtime configuration through a stable package API, not by duplicating runtime logic.

## Safety Rules

- Do not install, uninstall, or switch Node runtimes from this skill.
- Do not modify system PATH, nvm config, or shell profile.
- Do not change project runtime binding unless explicitly requested, previewed, and confirmed.
- Do not expose sensitive local environment values.
- Prefer read-only runtime inspection first.
