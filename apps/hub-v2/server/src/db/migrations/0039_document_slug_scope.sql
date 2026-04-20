DROP TRIGGER IF EXISTS trg_global_search_document_insert;
DROP TRIGGER IF EXISTS trg_global_search_document_update;
DROP TRIGGER IF EXISTS trg_global_search_document_delete;

DROP INDEX IF EXISTS idx_documents_slug;
DROP INDEX IF EXISTS idx_documents_project_id;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_category;
DROP INDEX IF EXISTS idx_documents_updated_at;
DROP INDEX IF EXISTS idx_documents_project_slug_unique;

ALTER TABLE documents RENAME TO documents__legacy_0039;

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  summary TEXT,
  content_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version TEXT,
  created_by TEXT,
  publish_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

INSERT INTO documents (
  id, project_id, slug, title, category, summary, content_md, status,
  version, created_by, publish_at, created_at, updated_at
)
SELECT
  id, project_id, slug, title, category, summary, content_md, status,
  version, created_by, publish_at, created_at, updated_at
FROM documents__legacy_0039;

DROP TABLE documents__legacy_0039;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_project_slug_unique
  ON documents(COALESCE(project_id, '__global__'), slug);
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_insert
AFTER INSERT ON documents
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

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_delete
AFTER DELETE ON documents
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'document' AND entity_id = OLD.id;
END;
