ALTER TABLE documents ADD COLUMN deleted_at TEXT;
ALTER TABLE documents ADD COLUMN deleted_by TEXT;

DROP INDEX IF EXISTS idx_documents_project_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_project_slug_unique
  ON documents(COALESCE(project_id, '__global__'), slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_deleted_at
  ON documents(deleted_at);

DROP TRIGGER IF EXISTS trg_global_search_document_insert;
DROP TRIGGER IF EXISTS trg_global_search_document_update;
DROP TRIGGER IF EXISTS trg_global_search_document_delete;

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_insert
AFTER INSERT ON documents
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO global_search_fts (
    entity_type,
    entity_id,
    project_id,
    status,
    title,
    body,
    updated_at
  )
  VALUES (
    'document',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.slug, '') || ' ' ||
      coalesce(NEW.summary, '') || ' ' ||
      coalesce(NEW.category, '') || ' ' ||
      coalesce(NEW.version, '') || ' ' ||
      coalesce(NEW.content_md, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_update
AFTER UPDATE ON documents
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'document' AND entity_id = OLD.id;

  INSERT INTO global_search_fts (
    entity_type,
    entity_id,
    project_id,
    status,
    title,
    body,
    updated_at
  )
  SELECT
    'document',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.slug, '') || ' ' ||
      coalesce(NEW.summary, '') || ' ' ||
      coalesce(NEW.category, '') || ' ' ||
      coalesce(NEW.version, '') || ' ' ||
      coalesce(NEW.content_md, '')
    ),
    NEW.updated_at
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_delete
AFTER DELETE ON documents
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'document' AND entity_id = OLD.id;
END;

ALTER TABLE announcements ADD COLUMN deleted_at TEXT;
ALTER TABLE announcements ADD COLUMN deleted_by TEXT;

ALTER TABLE releases ADD COLUMN deleted_at TEXT;
ALTER TABLE releases ADD COLUMN deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at
  ON announcements(deleted_at);

CREATE INDEX IF NOT EXISTS idx_releases_deleted_at
  ON releases(deleted_at);

DROP TRIGGER IF EXISTS trg_global_search_release_insert;
DROP TRIGGER IF EXISTS trg_global_search_release_update;
DROP TRIGGER IF EXISTS trg_global_search_release_delete;

CREATE TRIGGER IF NOT EXISTS trg_global_search_release_insert
AFTER INSERT ON releases
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO global_search_fts (
    entity_type,
    entity_id,
    project_id,
    status,
    title,
    body,
    updated_at
  )
  VALUES (
    'release',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.version, '') || ' ' ||
      coalesce(NEW.channel, '') || ' ' ||
      coalesce(NEW.notes, '') || ' ' ||
      coalesce(NEW.download_url, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_release_update
AFTER UPDATE ON releases
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'release' AND entity_id = OLD.id;

  INSERT INTO global_search_fts (
    entity_type,
    entity_id,
    project_id,
    status,
    title,
    body,
    updated_at
  )
  SELECT
    'release',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.version, '') || ' ' ||
      coalesce(NEW.channel, '') || ' ' ||
      coalesce(NEW.notes, '') || ' ' ||
      coalesce(NEW.download_url, '')
    ),
    NEW.updated_at
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_release_delete
AFTER DELETE ON releases
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'release' AND entity_id = OLD.id;
END;
