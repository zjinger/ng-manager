# ngm-hub Web UI Design

## Technology

Recommended stack:

- Angular
- ng-zorro-antd

This matches the ng-manager UI ecosystem.

---

## Application Layout

```
+--------------------------------------------------+
| Header                                           |
+----------------------+---------------------------+
| Sidebar              | Content Area              |
|                      |                           |
| Dashboard            | Page Content              |
| Announcements        |                           |
| Docs                 |                           |
| Feedback             |                           |
| Releases             |                           |
+----------------------+---------------------------+
```

---

## Page Structure

### Dashboard

Displays system overview.

Widgets:

- Total feedback count
- Open feedback count
- Latest release
- Recent announcements
- Recent feedback

---

### Announcements

Admin interface for managing announcements.

List fields:

- Title
- Status
- Publish date
- Updated date

Form fields:

- Title
- Summary
- Markdown content
- Status
- Pinned flag

---

### Docs

Manages Markdown documentation.

List fields:

- Slug
- Title
- Status
- Updated date

Form fields:

- Slug
- Title
- Summary
- Markdown content
- Status

Markdown files stored in server filesystem.

---

### Feedback

Central issue tracking interface.

List fields:

- ID
- Type
- Title
- Status
- Source (CLI/Desktop)
- Project name
- Created date

Filters:

- Status
- Type
- Source
- Keyword search

Feedback detail page shows:

- Content
- Client environment info
- Attachments
- Admin notes

---

### Releases

Manages client version metadata.

List fields:

- Channel
- Version
- Status
- Published date

Form fields:

- Channel (CLI/Desktop)
- Version
- Title
- Release notes
- Download URL
- Status

Clients query:

```
GET /api/client/releases/latest
```

---

## Routing

```
/dashboard
/announcements
/docs
/feedback
/releases
```

---

## WebSocket Integration

The admin console connects to the hub WebSocket endpoint.

Used for:

- New feedback notifications
- Announcement updates
- Release publishing alerts

---

## Summary

The hub-web UI is intentionally minimal.

Its purpose is operational management of ngm-hub content rather than serving as a full enterprise admin platform.
