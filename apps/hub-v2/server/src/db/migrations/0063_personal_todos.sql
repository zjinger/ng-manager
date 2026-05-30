CREATE TABLE IF NOT EXISTS personal_todo_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personal_todo_tags_user_id
  ON personal_todo_tags(user_id);

CREATE TABLE IF NOT EXISTS personal_todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personal_todos_user_id
  ON personal_todos(user_id);

CREATE INDEX IF NOT EXISTS idx_personal_todos_user_status
  ON personal_todos(user_id, status);

CREATE TABLE IF NOT EXISTS personal_todo_tag_links (
  todo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES personal_todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES personal_todo_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personal_todo_tag_links_tag_id
  ON personal_todo_tag_links(tag_id);

CREATE TABLE IF NOT EXISTS personal_todo_seed_state (
  user_id TEXT PRIMARY KEY,
  sample_todos_seeded_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
