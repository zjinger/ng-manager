CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT,
  client_name TEXT,
  client_version TEXT,
  os_info TEXT,
  project_key TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(category);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key ON feedbacks(project_key);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key_status ON feedbacks(project_key, status);


CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  content_md TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all',
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  publish_at TEXT,
  expire_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON announcements(publish_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_project_id ON announcements(project_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status_project_id ON announcements(status, project_id);


CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  content_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  version TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status_project_id ON documents(status, project_id);


CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  must_change_password INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);


CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(project_key);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);


CREATE TABLE IF NOT EXISTS shared_config (
  id TEXT PRIMARY KEY,
  project_id TEXT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  config_key TEXT NOT NULL,
  config_name TEXT NOT NULL,
  category TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'json',
  config_value TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_encrypted INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_config_project_id ON shared_config(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_config_scope ON shared_config(scope);
CREATE INDEX IF NOT EXISTS idx_shared_config_project_scope ON shared_config(project_id, scope);
CREATE UNIQUE INDEX IF NOT EXISTS uk_shared_config_project_key ON shared_config(project_id, config_key);


CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  channel TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  download_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_releases_project_id ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_releases_channel ON releases(channel);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_published_at ON releases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_updated_at ON releases(updated_at DESC);