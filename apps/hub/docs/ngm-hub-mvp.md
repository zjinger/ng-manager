# ngm-hub MVP Design

Last Updated: 2026-03-06

## Overview

`ngm-hub` is an **optional internal service** designed to enhance the ng-manager ecosystem.

It provides shared information services for ng-manager clients such as:

- Announcements
- Documentation
- Feedback collection
- Release metadata
- WebSocket notifications

The hub **must not break the Local-first principle** of ng-manager.

Clients (CLI / Desktop) must continue functioning even when the hub is unavailable.

---

## Design Principles

1. Local-first architecture must remain intact
2. Hub is optional and loosely coupled
3. Hub acts as a **content distribution and feedback center**
4. Hub does not control client execution
5. Hub should remain simple and maintainable

---

## MVP Feature Scope

### Included

- Feedback Center
- Announcement Center
- Documentation Center
- Release Metadata
- WebSocket Notification Channel
- Minimal Admin Console

### Excluded (Future)

- Shared credential storage
- Remote command execution
- Complex RBAC systems
- Multi-tenant architecture
- AI-assisted analysis

---

## Architecture

```
ngm-cli / ngm-desktop
        |
        | HTTP + WebSocket (optional)
        v
      ngm-hub
        |
        ├─ hub-server (Fastify)
        └─ hub-web (Angular)
```

---

## Data Storage

Hub uses a hybrid storage approach.

Structured data:

- SQLite database

Unstructured content:

- Markdown files (docs)
- Uploaded files (feedback attachments)

Directory structure:

```
data/hub
  hub.db
  docs/
  uploads/
```

---

## Core Modules

### Feedback

Collect bug reports and suggestions from clients.

### Announcements

Internal broadcast system for client notifications.

### Docs

Internal knowledge base using Markdown.

### Releases

Version metadata used by clients for update checks.

### WebSocket

Push notifications to connected clients.

---

## Client Integration

Clients may optionally configure a hub endpoint.

Example configuration:

```
hub:
  url: http://hub.internal:8080
```

Capabilities enabled when connected:

- View announcements
- Check updates
- Submit feedback
- Receive notifications

---

## Version Roadmap

### v0.1

- Feedback module
- Basic dashboard
- Minimal authentication
- WebSocket infrastructure

### v0.2

- Announcement system
- Documentation management
- Release metadata

### v0.3

- Client integrations
- Improved dashboard analytics
- Knowledge base expansion

---

## Summary

ngm-hub should remain **small, stable, and optional**.

Its purpose is to support collaboration and information sharing around ng-manager without centralizing control.
