# ngm-hub 数据库 Schema 设计

最后更新：2026-03-06

## 概述

本文档定义 `ngm-hub` 使用的 **SQLite 数据库结构**。

Hub 采用 **结构化数据入库 + 内容文件化存储** 的方式：

| 数据类型 | 存储方式 |
|---|---|
| 元数据 | SQLite |
| 文档正文 | Markdown 文件 |
| 附件 | 文件系统 |

推荐目录结构：

```
data/hub
├─ hub.db
├─ docs/
└─ uploads/
```

---

# 实体关系概览

核心实体：

- Announcements（公告）
- Docs（文档）
- Feedback（反馈）
- FeedbackAttachments（反馈附件）
- FeedbackNotes（反馈备注）
- Releases（版本信息）

关系：

```
Feedback 1 ─── N FeedbackAttachments
Feedback 1 ─── N FeedbackNotes
```

---

# 公告表 announcements

用于发布系统公告。

```sql
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

# 文档表 docs

文档元数据存数据库，正文存 Markdown 文件。

```sql
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

# 反馈表 feedbacks

记录 CLI / Desktop 客户端提交的反馈。

```sql
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

# 反馈附件表 feedback_attachments

用于存储截图或日志附件。

```sql
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

# 反馈备注表 feedback_notes

管理员处理反馈时的备注。

```sql
CREATE TABLE feedback_notes (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT
);
```

---

# 版本表 releases

存储客户端版本信息，用于更新检测。

```sql
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

# 索引建议

```sql
CREATE INDEX idx_feedback_status ON feedbacks(status);
CREATE INDEX idx_feedback_created ON feedbacks(created_at);
CREATE INDEX idx_docs_slug ON docs(slug);
CREATE INDEX idx_releases_channel ON releases(channel);
```

---

# 总结

ngm-hub 的数据库设计保持 **小而稳定**，只存储必要的结构化信息。
