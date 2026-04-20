ALTER TABLE releases
  ADD COLUMN sync_project_version INTEGER NOT NULL DEFAULT 1 CHECK (sync_project_version IN (0, 1));
