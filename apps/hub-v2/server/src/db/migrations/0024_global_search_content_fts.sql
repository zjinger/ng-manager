INSERT INTO global_search_fts (
  entity_type,
  entity_id,
  project_id,
  title,
  body,
  updated_at
)
SELECT
  'document' AS entity_type,
  d.id AS entity_id,
  d.project_id,
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
  title,
  body,
  updated_at
)
SELECT
  'release' AS entity_type,
  r.id AS entity_id,
  r.project_id,
  r.title,
  trim(
    coalesce(r.version, '') || ' ' ||
    coalesce(r.channel, '') || ' ' ||
    coalesce(r.notes, '') || ' ' ||
    coalesce(r.download_url, '')
  ) AS body,
  r.updated_at
FROM releases r;

CREATE TRIGGER IF NOT EXISTS trg_global_search_document_insert
AFTER INSERT ON documents
BEGIN
  INSERT INTO global_search_fts (
    entity_type,
    entity_id,
    project_id,
    title,
    body,
    updated_at
  )
  VALUES (
    'document',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'document',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'release',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'release',
    NEW.id,
    NEW.project_id,
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
