# ngm-hub Server Architecture

## Technology Stack

- Node.js
- Fastify
- TypeScript
- SQLite
- WebSocket

---

## Directory Structure

```
apps/hub-server
├─ src
│  ├─ app.ts
│  ├─ env.ts
│  │
│  ├─ plugins
│  │   ├─ db.plugin.ts
│  │   ├─ auth.plugin.ts
│  │   ├─ ws.plugin.ts
│  │   ├─ static.plugin.ts
│  │   └─ error.plugin.ts
│  │
│  ├─ modules
│  │   ├─ announcement
│  │   ├─ docs
│  │   ├─ feedback
│  │   ├─ release
│  │   └─ dashboard
│  │
│  ├─ infra
│  │   ├─ sqlite
│  │   └─ filesystem
│  │
│  └─ utils
│
├─ migrations
└─ public
```

---

## Plugin Responsibilities

### db.plugin.ts

Initializes SQLite connection and repository instances.

### auth.plugin.ts

Provides minimal admin authentication using BasicAuth.

### ws.plugin.ts

Manages WebSocket client connections and broadcast events.

### static.plugin.ts

Serves:

- hub-web static assets
- uploaded files

### error.plugin.ts

Centralized error handling.

---

## Modules

### Feedback Module

Handles:

- Feedback submission
- Attachments
- Admin review workflow

Routes:

```
POST /api/client/feedback
GET /api/admin/feedback
PATCH /api/admin/feedback/:id/status
```

---

### Announcement Module

Allows administrators to publish broadcast messages.

Routes:

```
GET /api/client/announcements
POST /api/admin/announcements
```

---

### Docs Module

Stores documentation metadata and Markdown content.

Routes:

```
GET /api/client/docs
GET /api/client/docs/:slug
```

---

### Release Module

Used by clients to check update availability.

Routes:

```
GET /api/client/releases/latest
POST /api/admin/releases
```

---

## WebSocket Notifications

Endpoint:

```
GET /ws
```

Events:

```
announcement.published
feedback.created
release.published
doc.updated
```

Clients listen for events and fetch details via HTTP.

---

## Environment Configuration

Example:

```
PORT=8080
DATA_DIR=./data/hub
HUB_ADMIN_USERNAME=admin
HUB_ADMIN_PASSWORD=ngm123456
```

---

## Storage Layout

```
data/hub
├─ hub.db
├─ docs
└─ uploads
```

---

## Summary

The hub-server is designed as a lightweight modular Fastify application that focuses on maintainability and simplicity.
