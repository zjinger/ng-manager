CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5 (
  entity_type UNINDEXED,
  entity_id UNINDEXED,
  project_id UNINDEXED,
  title,
  body,
  updated_at UNINDEXED,
  tokenize = 'unicode61'
);

DELETE FROM global_search_fts;

INSERT INTO global_search_fts (
  entity_type,
  entity_id,
  project_id,
  title,
  body,
  updated_at
)
SELECT
  'issue' AS entity_type,
  i.id AS entity_id,
  i.project_id,
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
  title,
  body,
  updated_at
)
SELECT
  'rd' AS entity_type,
  r.id AS entity_id,
  r.project_id,
  r.title,
  trim(
    coalesce(r.rd_no, '') || ' ' ||
    coalesce(r.description, '') || ' ' ||
    coalesce(r.assignee_name, '') || ' ' ||
    coalesce(r.creator_name, '')
  ) AS body,
  r.updated_at
FROM rd_items r;

CREATE TRIGGER IF NOT EXISTS trg_global_search_issue_insert
AFTER INSERT ON issues
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
    'issue',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'issue',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'rd',
    NEW.id,
    NEW.project_id,
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
    title,
    body,
    updated_at
  )
  VALUES (
    'rd',
    NEW.id,
    NEW.project_id,
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
