-- [0073] Mobile app version management

CREATE TABLE IF NOT EXISTS mobile_app_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  version TEXT NOT NULL,
  build_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('published', 'testing', 'draft', 'archived')),
  package_upload_id TEXT NOT NULL,
  changelog_json TEXT NOT NULL DEFAULT '[]',
  release_channel TEXT NOT NULL DEFAULT '',
  min_os_version TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, platform, version, build_number),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (package_upload_id) REFERENCES uploads(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_mobile_app_versions_project_status
  ON mobile_app_versions(project_id, status, published_at);

CREATE INDEX IF NOT EXISTS idx_mobile_app_versions_project_platform
  ON mobile_app_versions(project_id, platform, status, published_at);

CREATE TABLE IF NOT EXISTS mobile_app_release_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'archive', 'delete', 'download')),
  actor_id TEXT,
  actor_name TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES mobile_app_versions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mobile_app_release_logs_project_created
  ON mobile_app_release_logs(project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mobile_app_release_logs_version_created
  ON mobile_app_release_logs(version_id, created_at);
