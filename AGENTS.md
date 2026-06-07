# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Repository Overview

`ng-manager` is a TypeScript monorepo for a developer tool platform.

It includes:

- Angular frontend applications and UI packages.
- Fastify/Node backend services.
- CLI tooling.
- Electron/desktop shell integration.
- Task execution, process control, runtime events, and WebSocket log streaming.
- Configuration, storage, sprite, runtime, desktop, and MCP-related packages.
- `apps/hub-v2`, a collaboration platform with projects, documents, issues, RD management, feedback, uploads, permissions, dashboard, and notifications.

The main product architecture is a dual-entry, single-backend, single-frontend model:

- `packages/cli` is a lightweight local entry point.
- `desktop` is the packaged desktop shell entry point.
- `packages/server` is the single local backend.
- `webapp` is the single frontend used by both entry points.

Treat CLI and desktop as two launch modes for the same product, not as separate products.

## Communication

- Explain implementation results to the user in Chinese.
- Keep final summaries concise and concrete.
- State assumptions when requirements are ambiguous.
- Ask for clarification only when a choice may cause data loss, security impact, breaking API changes, or large architectural divergence.
- When reporting code changes, include changed files, implemented behavior, why the approach fits the repository, and verification commands run or skipped.

## Working Method

- Inspect related files before modifying code.
- Follow existing structure, naming, dependency direction, and style.
- Make the smallest maintainable change that solves the requested problem.
- Preserve public APIs and runtime behavior unless the user explicitly asks for a breaking change.
- Avoid broad rewrites, speculative abstractions, and unrelated cleanup.
- Do not introduce new dependencies unless clearly justified by the task.
- Keep cross-platform behavior in mind, especially Windows shell commands and path handling.
- For non-trivial changes, first form an implementation plan:
  - files to inspect
  - files to modify
  - files to add
  - responsibility of each file
  - tests or verification to run
  - architecture risks

## Repository Map

- `packages/cli`: CLI startup, shutdown, status checks, browser launch, and local entry orchestration.
- `desktop`: Electron/desktop shell lifecycle, tray, native dialogs, and OS integration.
- `packages/server`: Fastify backend, local APIs, local system/file orchestration, static frontend serving, health and lifecycle endpoints.
- `webapp`: primary Angular frontend used by CLI and desktop launch modes.
- `packages/task`: task execution, process drivers, logs, runtime state, and runtime events.
- `packages/config`: project configuration reading, schema, validation, and writeback logic.
- `packages/sprite`: sprite generation, icon processing, and style output.
- `packages/storage`, `packages/runtime`, `packages/desktop`: shared runtime and platform utilities.
- `packages/mcp-server`: MCP Tool Gateway for AI agents.
- `packages/sl-hub-v2-mcp`: Hub V2 related MCP tools, subject to consolidation strategy.
- `apps/hub-v2`: collaboration platform frontend/backend and deployment scripts.
- `apps/hub`, `apps/site`: application-level workspaces and documentation site.
- `scripts`: repository maintenance and release scripts.
- `ws-lab` and `test-ngm`: experimental or local integration workspaces.

## Architecture Rules

- Keep `packages/server` as the single backend authority for local runtime state.
- Keep `webapp` as the single UI source of truth.
- Keep `packages/cli` and `desktop` thin; do not put business rules, API domain logic, or UI-specific logic in entry-point layers.
- Prefer shared runtime services for startup orchestration such as port selection, lock files, health polling, timeouts, and graceful shutdown.
- Both CLI and desktop should rely on the same backend contracts for health checks, readiness, shutdown, and server address discovery.
- Represent frontend launch-mode differences through runtime configuration and capability flags, not duplicated pages or forked modules.
- Treat any change that breaks the dual-entry, single-backend, single-frontend model as an architectural exception that needs explicit user approval.
- Do not create a second local control plane when an existing package or server API already owns the state.
- Prefer shared core/domain services over duplicating behavior in entry-point packages.

## Code Organization Rules

- Keep files focused and domain-specific.
- Prefer TypeScript files under 250 lines when practical.
- Files over 400 lines should be treated as a refactoring signal unless there is a clear reason.
- Do not create new 500+ line tool, service, or utility files.
- Do not mix unrelated domains such as project, runtime, nginx, workspace, API, config, and CodeGraph in one file.
- Tool/adaptor layers should stay thin and delegate business logic to services, core packages, or shared utilities.
- Extract repeated safety, validation, redaction, path, URL, and operation-result logic into shared helpers.
- Prefer small cohesive modules over one large aggregate file.
- When a feature requires many helpers, split by responsibility before the file becomes hard to review.
- Tests may be longer than implementation files, but large test files should still be split by domain or behavior when practical.

## Dependency Direction

Follow this general dependency direction:

```text
entrypoints / adapters
  -> server / mcp-server / cli / desktop
  -> domain packages
  -> runtime/config/storage/task utilities
```

Rules:

- Entry points may call domain packages.
- Domain packages should not depend on UI, desktop, or MCP-specific code.
- `packages/server` may orchestrate local backend state and APIs.
- `packages/mcp-server` may call shared packages and the running local server, but must not become another business backend.
- Avoid circular dependencies between packages.

## MCP Server Rules

For `packages/mcp-server` work:

- Treat `packages/mcp-server` as an MCP Tool Gateway for AI agents.
- It is not the ng-manager local business server.
- It must not become a second `packages/server`.
- It may use shared packages for pure read-only or stateless logic.
- It should use the running local ng-manager server for stateful operations such as task execution, task stop, task logs, runtime writes, and service control.
- Do not start `packages/server` automatically from MCP tools.
- Do not duplicate Fastify HTTP routes from `packages/server`.
- Do not maintain a separate task/process registry inside `mcp-server`.
- Do not bypass existing core/server services for business state changes.

MCP tool files should stay thin. Tool handlers may contain:

- input schema
- tool description
- basic argument mapping
- calls to services/core/local server client
- structured result formatting

Tool handlers should not contain:

- large business workflows
- Nginx config generation internals
- process management internals
- arbitrary shell logic
- large validation/redaction utilities
- duplicated core/server logic

Keep MCP domains separated:

- router
- workspace
- project
- runtime
- nginx
- api
- config
- codegraph

Do not put project, runtime, nginx, workspace, API, and CodeGraph logic into one large tools file.

## MCP Controlled Operation Safety

All MCP write or execution tools must support preview/dry-run behavior.

Real execution requires:

- an explicit confirmation argument
- an environment policy flag

Use:

- `NGM_MCP_ALLOW_EXECUTE=true` for execution and service-control operations
- `NGM_MCP_ALLOW_WRITE=true` for configuration write operations

Never expose:

- arbitrary shell execution
- arbitrary PID kill
- arbitrary file write
- raw `.env` contents
- secrets, tokens, passwords, authorization headers, cookies, private keys

For project execution tools:

- Only run scripts that exist in `package.json`.
- Do not accept arbitrary shell command strings.
- Use ng-manager managed task/server APIs so UI, CLI, and MCP see consistent state.
- Return task identifiers and compact status information instead of blocking indefinitely.

For stop tools:

- Stop only ng-manager managed tasks.
- Do not kill arbitrary PIDs.
- Require clear task or project identity for real stop operations.

For runtime write tools:

- Only write ng-manager managed project runtime configuration.
- Do not modify system `PATH`.
- Do not modify nvm configuration.
- Do not edit shell profiles.
- Do not install Node runtimes unless a separate explicit controlled tool is designed.

For Nginx tools:

- Reload only the ng-manager managed local Nginx instance.
- Validate config before reload.
- Save proxy configuration through existing Nginx services.
- Do not write arbitrary Nginx files.
- Do not return raw certificate key paths or unredacted extra config to agents.
- Do not auto-reload after save unless explicitly requested and execution policy allows it.

## Local Server Client Rules

The local server client must only connect to local ng-manager server endpoints.

Allowed hosts:

- `127.0.0.1`
- `localhost`
- `::1`

It must not silently connect to remote servers.

If the local server is unavailable:

- return a structured error
- suggest starting `ngm server` or `ngm ui`
- do not auto-start the local server unless a future explicit controlled tool is designed for that

## Result Shape Rules

Tool and service results should be structured and agent-friendly.

Prefer returning:

- operation status
- preview / blocked / executed / failed state
- safety message
- reason
- warnings
- compact result data
- next steps

Avoid returning:

- long raw logs
- full config files
- stack traces
- sensitive local data
- large unbounded arrays

Logs must be tailed, size-limited, and redacted.

## TypeScript Rules

- Prefer TypeScript for all new code.
- Use explicit types for exported APIs, service methods, DTOs, and shared interfaces.
- Keep imports, exports, and package boundaries consistent.
- Prefer existing helpers and local APIs over new abstractions.
- Keep code readable and direct; avoid cleverness that makes review harder.
- Avoid `any` in exported interfaces and shared service contracts unless there is a clear boundary reason.
- Prefer schema validation at external boundaries: MCP inputs, HTTP inputs, config files, and user-provided paths.

## Angular Rules

- Use existing Angular patterns in the repository.
- Use ng-zorro components for UI work.
- Use Less styles and follow existing responsive layout conventions.
- Keep templates readable; avoid complex inline template logic.
- Put business logic and data access in services or stores, not in templates.
- Keep UI consistent with the current `ng-manager` and `apps/hub-v2` visual style.
- Check related routes, providers, state services, and API clients when adding pages or features.
- Avoid visual-heavy redesign unless explicitly requested.

## Backend Rules

- Follow the existing Fastify plugin/service/route organization.
- Keep route handlers thin; put business logic in services.
- Preserve existing success and error response conventions.
- Reuse existing validation, auth, permission, request-id, and error-handling patterns.
- For SQLite or `better-sqlite3` schema changes, review the current schema and migration style before editing.
- Do not change database schema without adding or updating the relevant migration.
- Do not introduce complex auth/RBAC unless the task explicitly requires it.

## CLI, Task, And Runtime Rules

- Preserve existing CLI command behavior and flags unless explicitly requested.
- For process/task changes, verify lifecycle behavior: start, output, exit, error, stop, and restart.
- For WebSocket task logs and runtime events, preserve event names, payload shapes, and subscription behavior unless explicitly asked to change them.
- Avoid changes that could break task history, syslog, persisted runtime state, or frontend consumers.
- Keep task/process state unified across CLI, WebApp, Desktop, Server, and MCP.

## Hub V2 Rules

For `apps/hub-v2` work:

- Preserve auth, permission, role, project scope, and upload lifecycle behavior.
- Keep route, service, and data-access boundaries clear.
- Maintain the existing enterprise-style UI direction.
- For documents, issues, RD management, announcements, feedback, reimbursements, notifications, and uploads, check both frontend and backend contracts when adding business behavior.
- Preserve markdown attachment/reference tracking and cleanup strategies.
- Hub V2 is collaboration platform data; do not treat it as the local command execution control plane.

## Skills And Agent Routing

The repository may include skills under documentation directories, especially for Hub V2 and NGM local capabilities.

Current NGM local skills may include:

- `ngm-router`
- `ngm-project`
- `ngm-runtime`
- `ngm-nginx`
- `ngm-workspace`

Rules:

- Hub V2 skills are for collaboration platform data: issues, RD workflows, documents, Project Token, and collaboration records.
- NGM local skills are for local engineering control: project scripts, runtime, Nginx, workspace, MCP, and CodeGraph.
- Do not route all ng-manager tasks to Hub V2 API/docs.
- When adding MCP tools, keep tool names and descriptions aligned with the relevant skill domain.
- Prefer read-only tools before write/execute tools.
- Controlled write/execute tools must follow the MCP safety rules above.

## Verification

Choose the narrowest useful verification for the change:

- `npm run build` for full TypeScript project build.
- `npm run build:server` for server plus web frontend build.
- `npm run build -w <workspace>` for package-scoped builds when available.
- `npm run mcp:build` for MCP server changes.
- `npm run pack:all` for package/release packaging changes.
- `npm run release:preflight` before release-sensitive changes.
- `npm start` for local development startup when relevant.
- `npm run electron:serve` for desktop runtime verification when relevant.

For MCP changes, prefer running:

```bash
npm run mcp:build
```

If tests exist for the changed package, run the narrowest relevant test command.

If verification cannot be run, clearly state what should be run and why it was skipped.

## Output After Code Changes

When code changes are made, summarize in Chinese:

- Which files changed.
- What was implemented.
- Why this approach fits the repository.
- Which verification commands were run or should be run.
- Any remaining risks or follow-up tasks.
