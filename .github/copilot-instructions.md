# Copilot Instructions for ng-manager

This repository is the ng-manager monorepo.

Use Chinese when explaining implementation results to the user.

General rules:

- Prefer TypeScript.
- Follow existing project structure and naming conventions.
- Inspect related files before modifying code.
- Keep changes minimal and maintainable.
- Do not rewrite large modules unless explicitly requested.
- Preserve existing APIs and behaviors unless the user asks for a breaking change.
- For Angular UI, use ng-zorro, Less, and existing responsive layout patterns.
- For Fastify backend, keep route handlers thin and put business logic in services.
- For SQLite changes, update migrations when schema changes are required.
- For WebSocket/task flows, preserve existing event names and payload compatibility.
- For apps/hub-v2, preserve permission, project scope, upload lifecycle, and enterprise-style UI conventions.