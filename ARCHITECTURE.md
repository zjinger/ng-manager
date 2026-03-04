# NG Manager Architecture

## Purpose

This document defines the current architectural constraints for `ng-manager`.
It is intended to keep the product on a single execution model while allowing
two user-facing entry points.

## Product Model

`ng-manager` follows a dual-entry, single-backend, single-frontend model:

- `cli` is a lightweight entry point for users who do not want to install the desktop app.
- `desktop` is a desktop-shell entry point for users who want a packaged local application.
- `server` is the single local backend used by both entry points.
- `webapp` is the single UI used by both entry points.

The system should behave as one product with two launch modes, not as two
separate products.

## Primary Runtime Flow

The canonical runtime chain is:

1. User starts `cli` or `desktop`.
2. The entry point ensures the local `server` is available.
3. The `server` exposes local APIs and serves the UI runtime.
4. The user interacts through `webapp`.

This flow must stay consistent across both launch modes.

## Component Responsibilities

### `packages/cli`

`cli` is responsible for:

- starting or reusing the local server
- stopping the local server
- checking local server status
- opening the UI in a browser when requested

`cli` must not contain business logic, API domain logic, or UI-specific logic.

### `desktop`

`desktop` is responsible for:

- application window lifecycle
- local process lifecycle for the bundled runtime
- desktop-only shell features such as tray, native dialogs, and OS integration

`desktop` must not duplicate server business logic or maintain a separate API
implementation.

### `packages/server`

`server` is the single backend runtime and is responsible for:

- local HTTP API endpoints
- local system and file orchestration
- serving static frontend assets in production
- exposing health and lifecycle endpoints needed by entry points

`server` is the only backend authority for local runtime state.

### `webapp`

`webapp` is the single frontend and is responsible for:

- application UI
- user interaction flows
- rendering state returned by `server`

`webapp` should adapt by runtime configuration rather than by maintaining
separate codepaths for CLI mode and desktop mode.

## Shared Runtime Rules

### Single Local Backend

At a given time, there should be one reusable local `server` instance per user
data directory unless there is an explicit reason to isolate instances.

Both `cli` and `desktop` should prefer:

1. detect an existing healthy `server`
2. reuse it if valid
3. start a new instance only when necessary

They should not use conflicting startup strategies.

### Shared Server Contract

Both entry points must rely on the same backend contract for:

- health checks
- startup readiness
- shutdown
- server address discovery

Health checks must be based on the `server` response contract rather than on
entry-point-specific assumptions.

### Shared Startup Orchestration

Server startup logic such as:

- port selection
- lock file handling
- health polling
- timeout handling
- graceful shutdown

should be implemented in shared code, not separately in `cli` and `desktop`.

## Frontend Runtime Modes

`webapp` may run in multiple environments, but it remains one frontend.

Differences between browser launch and desktop launch should be represented by
runtime configuration, such as:

- runtime mode
- server base URL
- availability of desktop shell features

Feature differences should be controlled through capability flags, not through
forked pages or duplicate frontend modules.

## Repository Role Map

The repository is organized into these roles:

- `packages/*`: reusable libraries and backend packages
- `webapp`: primary frontend application
- `desktop`: desktop shell application
- `ws-lab`: non-primary experimental workspace
- `test-ngm`: local demo or integration playground
- `scripts`: repository maintenance scripts

Only `cli`, `desktop`, `server`, and `webapp` define the main product runtime.

## Non-Goals

The current architecture explicitly avoids:

- separate backend implementations for CLI and desktop
- separate frontend implementations for web and desktop modes
- business rules implemented in entry-point layers
- long-term drift between startup logic in `cli` and `desktop`

## Change Policy

When adding new features:

1. decide which layer owns the behavior
2. prefer shared runtime services over duplicated orchestration
3. keep entry points thin
4. keep `server` as the single backend source of truth
5. keep `webapp` as the single UI source of truth

Any change that breaks the dual-entry, single-backend, single-frontend model
should be treated as an architectural exception and reviewed explicitly.
