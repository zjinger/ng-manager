# ngm-hub Database Schema

Last Updated: 2026-03-06

## Overview

This document defines the **SQLite database schema** used by `ngm-hub`.

The hub database stores **structured metadata**, while large or unstructured content is stored in the filesystem.

Storage strategy:

| Data Type | Storage |
|---|---|
| Metadata | SQLite |
| Docs content | Markdown files |
| Attachments | File system |

Directory layout:

```
data/hub
├─ hub.db
├─ docs/
└─ uploads/
```

---

# Entity Relationship Overview

Main entities:

- Announcements
- Docs
- Feedback
- FeedbackAttachments
- FeedbackNotes
- Releases

Relationship overview:

```
Feedback 1 ─── N FeedbackAttachments
Feedback 1 ─── N FeedbackNotes
```

---

# Announcements

Announcements broadcast important messages to clients.

### SQL

```
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  pinned INTEGER DEFAULT 0,
  publish_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# Docs

Docs metadata stored in DB, markdown stored in filesystem.

### SQL

```
CREATE TABLE docs (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# Feedback

Feedback submitted from CLI / Desktop.

### SQL

```
CREATE TABLE feedbacks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,

  source TEXT NOT NULL,
  client_version TEXT,
  os_name TEXT,
  os_version TEXT,
  node_version TEXT,
  electron_version TEXT,

  project_id TEXT,
  project_name TEXT,

  reporter_name TEXT,
  reporter_email TEXT,

  route TEXT,
  module TEXT,
  last_error_summary TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# Feedback Attachments

Screenshots or logs uploaded with feedback.

### SQL

```
CREATE TABLE feedback_attachments (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL
);
```

---

# Feedback Notes

Admin notes for feedback triage.

### SQL

```
CREATE TABLE feedback_notes (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT
);
```

---

# Releases

Stores version metadata used by CLI and Desktop clients.

### SQL

```
CREATE TABLE releases (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  download_url TEXT,
  status TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# Index Recommendations

```
CREATE INDEX idx_feedback_status ON feedbacks(status);
CREATE INDEX idx_feedback_created ON feedbacks(created_at);
CREATE INDEX idx_docs_slug ON docs(slug);
CREATE INDEX idx_releases_channel ON releases(channel);
```

---

# Summary

The ngm-hub database is intentionally **small and stable**, focusing only on structured metadata required for hub operations.
