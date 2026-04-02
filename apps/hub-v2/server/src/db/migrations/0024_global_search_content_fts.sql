-- Merged migration for global search content + status column.
-- Final shape keeps status UNINDEXED to filter published global content
-- without subqueries in runtime search SQL.

DROP TRIGGER IF EXISTS trg_global_search_issue_insert;
DROP TRIGGER IF EXISTS trg_global_search_issue_update;
DROP TRIGGER IF EXISTS trg_global_search_issue_delete;
DROP TRIGGER IF EXISTS trg_global_search_rd_insert;
DROP TRIGGER IF EXISTS trg_global_search_rd_update;
DROP TRIGGER IF EXISTS trg_global_search_rd_delete;
DROP TRIGGER IF EXISTS trg_global_search_document_insert;
DROP TRIGGER IF EXISTS trg_global_search_document_update;
DROP TRIGGER IF EXISTS trg_global_search_document_delete;
DROP TRIGGER IF EXISTS trg_global_search_release_insert;
DROP TRIGGER IF EXISTS trg_global_search_release_update;
DROP TRIGGER IF EXISTS trg_global_search_release_delete;

DROP TABLE IF EXISTS global_search_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5 (
  entity_type UNINDEXED,
  entity_id UNINDEXED,
  project_id UNINDEXED,
  status UNINDEXED,
  title,
  body,
  updated_at UNINDEXED,
  tokenize = 'unicode61'
);

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
  'issue' AS entity_type,
  i.id AS entity_id,
  i.project_id,
  i.status,
  i.title,
  trim(
    coalesce(i.issue_no, '') || ' ' ||
    coalesce(i.description, '') || ' ' ||
    coalesce(i.assignee_name, '') || ' ' ||
    coalesce(i.reporter_name, '')
  ) AS body,
  i.updated_at
FROM issues i;

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
  'rd' AS entity_type,
  r.id AS entity_id,
  r.project_id,
  r.status,
  r.title,
  trim(
    coalesce(r.rd_no, '') || ' ' ||
    coalesce(r.description, '') || ' ' ||
    coalesce(r.assignee_name, '') || ' ' ||
    coalesce(r.creator_name, '')
  ) AS body,
  r.updated_at
FROM rd_items r;

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
  'document' AS entity_type,
  d.id AS entity_id,
  d.project_id,
  d.status,
  d.title,
  trim(
    coalesce(d.slug, '') || ' ' ||
    coalesce(d.summary, '') || ' ' ||
    coalesce(d.category, '') || ' ' ||
    coalesce(d.version, '') || ' ' ||
    coalesce(d.content_md, '')
  ) AS body,
  d.updated_at
FROM documents d;

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
  'release' AS entity_type,
  r.id AS entity_id,
  r.project_id,
  r.status,
  r.title,
  trim(
    coalesce(r.version, '') || ' ' ||
    coalesce(r.channel, '') || ' ' ||
    coalesce(r.notes, '') || ' ' ||
    coalesce(r.download_url, '')
  ) AS body,
  r.updated_at
FROM releases r;

CREATE TRIGGER IF NOT EXISTS trg_global_search_issue_insert
AFTER INSERT ON issues
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
    'issue',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.issue_no, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.assignee_name, '') || ' ' ||
      coalesce(NEW.reporter_name, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_issue_update
AFTER UPDATE ON issues
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'issue' AND entity_id = OLD.id;

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
    'issue',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.issue_no, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.assignee_name, '') || ' ' ||
      coalesce(NEW.reporter_name, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_issue_delete
AFTER DELETE ON issues
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'issue' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_rd_insert
AFTER INSERT ON rd_items
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
    'rd',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.rd_no, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.assignee_name, '') || ' ' ||
      coalesce(NEW.creator_name, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_rd_update
AFTER UPDATE ON rd_items
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'rd' AND entity_id = OLD.id;

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
    'rd',
    NEW.id,
    NEW.project_id,
    NEW.status,
    NEW.title,
    trim(
      coalesce(NEW.rd_no, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.assignee_name, '') || ' ' ||
      coalesce(NEW.creator_name, '')
    ),
    NEW.updated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_global_search_rd_delete
AFTER DELETE ON rd_items
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'rd' AND entity_id = OLD.id;
END;

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

CREATE TRIGGER IF NOT EXISTS trg_global_search_release_insert
AFTER INSERT ON releases
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

CREATE TRIGGER IF NOT EXISTS trg_global_search_release_delete
AFTER DELETE ON releases
BEGIN
  DELETE FROM global_search_fts
  WHERE entity_type = 'release' AND entity_id = OLD.id;
END;

