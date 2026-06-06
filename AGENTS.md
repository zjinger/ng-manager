# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Repository Overview

`ng-manager` is a TypeScript monorepo for a developer tool platform. It includes:

- Angular frontend applications and UI packages.
- Fastify/Node backend services.
- CLI tooling.
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

## Working Method

- Inspect related files before modifying code.
- Follow existing structure, naming, dependency direction, and style.
- Make the smallest maintainable change that solves the requested problem.
- Preserve public APIs and runtime behavior unless the user explicitly asks for a breaking change.
- Avoid broad rewrites, speculative abstractions, and unrelated cleanup.
- Do not introduce new dependencies unless clearly justified by the task.
- Keep cross-platform behavior in mind, especially Windows shell commands and path handling.

## Repository Map

- `packages/cli`: CLI startup, shutdown, status checks, and browser launch.
- `desktop`: Electron/desktop shell lifecycle, tray, native dialogs, and OS integration.
- `packages/server`: Fastify backend, local APIs, local system/file orchestration, static frontend serving, health and lifecycle endpoints.
- `webapp`: primary Angular frontend used by CLI and desktop launch modes.
- `packages/task`: task execution, process drivers, logs, and runtime events.
- `packages/config`: project configuration reading, schema, and writeback logic.
- `packages/sprite`: sprite generation, icon processing, and style output.
- `packages/storage`, `packages/runtime`, `packages/desktop`: shared runtime and platform utilities.
- `packages/mcp-server` and `packages/sl-hub-v2-mcp`: MCP server related packages.
- `apps/hub-v2`: collaboration platform frontend/backend and deployment scripts.
- `apps/hub`, `apps/site`: application-level workspaces.
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

## TypeScript Rules

- Prefer TypeScript for all new code.
- Use explicit types for exported APIs, service methods, DTOs, and shared interfaces.
- Keep imports, exports, and package boundaries consistent.
- Prefer existing helpers and local APIs over new abstractions.
- Keep code readable and direct; avoid cleverness that makes review harder.

## Angular Rules

- Use existing Angular patterns in the repository.
- Use ng-zorro components for UI work.
- Use Less styles and follow existing responsive layout conventions.
- Keep templates readable; avoid complex inline template logic.
- Put business logic and data access in services or stores, not in templates.
- Keep UI consistent with the current `ng-manager` and `apps/hub-v2` visual style.
- Check related routes, providers, state services, and API clients when adding pages or features.

## Backend Rules

- Follow the existing Fastify plugin/service/route organization.
- Keep route handlers thin; put business logic in services.
- Preserve existing success and error response conventions.
- Reuse existing validation, auth, permission, request-id, and error-handling patterns.
- For SQLite or `better-sqlite3` schema changes, review the current schema and migration style before editing.
- Do not change database schema without adding or updating the relevant migration.

## CLI, Task, And Runtime Rules

- Preserve existing CLI command behavior and flags unless explicitly requested.
- For process/task changes, verify lifecycle behavior: start, output, exit, error, stop, and restart.
- For WebSocket task logs and runtime events, preserve event names, payload shapes, and subscription behavior unless explicitly asked to change them.
- Avoid changes that could break task history, syslog, persisted runtime state, or frontend consumers.

## Hub V2 Rules

For `apps/hub-v2` work:

- Preserve auth, permission, role, project scope, and upload lifecycle behavior.
- Keep route, service, and data-access boundaries clear.
- Maintain the existing enterprise-style UI direction.
- For documents, issues, RD management, announcements, feedback, reimbursements, notifications, and uploads, check both frontend and backend contracts when adding business behavior.
- Preserve markdown attachment/reference tracking and cleanup strategies.

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

If verification cannot be run, clearly state what should be run and why it was skipped.

## Output After Code Changes

When code changes are made, summarize in Chinese:

- Which files changed.
- What was implemented.
- Why this approach fits the repository.
- Which verification commands were run or should be run.
