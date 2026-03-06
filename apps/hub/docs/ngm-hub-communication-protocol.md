# ngm-hub Communication Protocol

Last Updated: 2026-03-06

## Overview

Defines communication between:

- ngm-cli
- ngm-desktop
- ngm-hub

Protocols used:

| Protocol | Purpose |
|---|---|
| HTTP | Data fetch / submission |
| WebSocket | Event notifications |

---

# HTTP API

Client-facing APIs:

Base path:

```
/api/client
```

---

## Announcements

```
GET /api/client/announcements
GET /api/client/announcements/:id
```

Response example:

```
[
  {
    "id":"ann-1",
    "title":"New Version Released",
    "summary":"ng-manager 0.3.0 released"
  }
]
```

---

## Docs

```
GET /api/client/docs
GET /api/client/docs/:slug
```

---

## Releases

Check latest version.

```
GET /api/client/releases/latest?channel=desktop
GET /api/client/releases/latest?channel=cli
```

Example:

```
{
  "version":"0.3.0",
  "title":"Major Update",
  "downloadUrl":"https://downloads/ngm-0.3.0.exe"
}
```

---

## Feedback

Submit feedback.

```
POST /api/client/feedback
```

Request:

```
{
  "type":"bug",
  "title":"CLI startup failed",
  "content":"error when running ngm ui"
}
```

Response:

```
{
  "id":"fb-102"
}
```

---

# WebSocket Protocol

Endpoint:

```
/ws
```

---

# Event Types

```
announcement.published
feedback.created
feedback.updated
release.published
doc.updated
```

---

# Event Format

```
{
  "type":"release.published",
  "version":"0.3.0",
  "channel":"desktop"
}
```

---

# Client Behavior

Recommended behavior:

| Event | Action |
|---|---|
| release.published | show update prompt |
| announcement.published | show notification |
| doc.updated | refresh cache |

---

# Design Rules

1. WebSocket only pushes events
2. Clients fetch details via HTTP
3. Hub failure must not break client
4. Protocol must remain backward compatible

---

# Summary

The communication protocol keeps the hub **optional and loosely coupled**, ensuring ng-manager maintains its local-first architecture.
