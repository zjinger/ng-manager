CREATE TABLE IF NOT EXISTS project_favorites (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  favorite_at TEXT NOT NULL,
  PRIMARY KEY (user_id, project_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_favorites_user_favorite_at
  ON project_favorites(user_id, favorite_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_favorites_project_id
  ON project_favorites(project_id);
