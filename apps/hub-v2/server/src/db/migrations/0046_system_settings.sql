-- [0046] 系统设置主数据表
-- Depends on: none
-- Notes: 仅提供配置存储，不承载权限逻辑
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  settings_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
