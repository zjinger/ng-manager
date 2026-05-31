CREATE TEMP TABLE IF NOT EXISTS tmp_rd_stage_task_baseline_backfill AS
WITH item_members AS (
  SELECT DISTINCT
    i.id AS item_id,
    i.project_id AS project_id,
    s.id AS stage_id,
    s.name AS stage_name,
    CASE s.name
      WHEN '需求确认' THEN 'requirement_confirmation'
      WHEN '方案设计' THEN 'solution_design'
      WHEN '功能开发' THEN 'feature_dev'
      WHEN '测试验证' THEN 'testing_validation'
      WHEN '交付上线' THEN 'delivery_launch'
      WHEN '项目结项' THEN 'project_closure'
      ELSE s.id
    END AS stage_key,
    TRIM(member.value) AS user_id
  FROM rd_items i
  JOIN rd_stages s ON s.id = i.stage_id
  JOIN json_each(CASE WHEN json_valid(i.member_ids) THEN i.member_ids ELSE '[]' END) member
  WHERE TRIM(member.value) <> ''

  UNION

  SELECT DISTINCT
    i.id AS item_id,
    i.project_id AS project_id,
    s.id AS stage_id,
    s.name AS stage_name,
    CASE s.name
      WHEN '需求确认' THEN 'requirement_confirmation'
      WHEN '方案设计' THEN 'solution_design'
      WHEN '功能开发' THEN 'feature_dev'
      WHEN '测试验证' THEN 'testing_validation'
      WHEN '交付上线' THEN 'delivery_launch'
      WHEN '项目结项' THEN 'project_closure'
      ELSE s.id
    END AS stage_key,
    i.assignee_id AS user_id
  FROM rd_items i
  JOIN rd_stages s ON s.id = i.stage_id
  WHERE i.assignee_id IS NOT NULL AND TRIM(i.assignee_id) <> ''
),
items_without_current_assignments AS (
  SELECT im.*
  FROM item_members im
  WHERE NOT EXISTS (
    SELECT 1
    FROM rd_stage_tasks t
    LEFT JOIN rd_stage_task_owners o
      ON o.task_id = t.id
     AND o.status <> 'cancelled'
    WHERE t.item_id = im.item_id
      AND t.stage_key = im.stage_key
      AND t.status <> 'cancelled'
      AND (o.id IS NOT NULL OR t.owner_id IS NOT NULL)
  )
)
SELECT
  'rdst_' || lower(hex(randomblob(8))) AS task_id,
  'rdsto_' || lower(hex(randomblob(8))) AS owner_id,
  im.project_id,
  im.item_id,
  im.stage_key,
  im.stage_name || '阶段任务' AS title,
  im.user_id,
  COALESCE(pm.display_name, CASE WHEN im.user_id = i.assignee_id THEN i.assignee_name END, im.user_id) AS user_name,
  COALESCE(p.progress, 0) AS progress,
  CASE
    WHEN COALESCE(p.progress, 0) >= 100 THEN 'done'
    WHEN COALESCE(p.progress, 0) > 0 THEN 'in_progress'
    ELSE 'pending'
  END AS status,
  CASE WHEN COALESCE(p.progress, 0) > 0 THEN COALESCE(p.updated_at, i.updated_at) ELSE NULL END AS started_at,
  CASE WHEN COALESCE(p.progress, 0) >= 100 THEN COALESCE(p.updated_at, i.updated_at) ELSE NULL END AS completed_at,
  COALESCE(
    (
      SELECT MAX(existing.sort_order)
      FROM rd_stage_tasks existing
      WHERE existing.item_id = im.item_id AND existing.stage_key = im.stage_key
    ),
    0
  ) + ROW_NUMBER() OVER (PARTITION BY im.item_id, im.stage_key ORDER BY im.user_id) * 10 AS sort_order,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS created_at
FROM items_without_current_assignments im
JOIN rd_items i ON i.id = im.item_id
LEFT JOIN rd_item_progress p ON p.item_id = im.item_id AND p.user_id = im.user_id
LEFT JOIN project_members pm ON pm.project_id = im.project_id AND pm.user_id = im.user_id;

INSERT INTO rd_stage_tasks (
  id, project_id, item_id, stage_key, title, description, status, owner_id, owner_name,
  progress, planned_start_at, planned_end_at, started_at, completed_at, sort_order,
  remark, created_at, updated_at
)
SELECT
  task_id, project_id, item_id, stage_key, title, NULL, status, user_id, user_name,
  progress, NULL, NULL, started_at, completed_at, sort_order,
  NULL, created_at, created_at
FROM tmp_rd_stage_task_baseline_backfill;

INSERT INTO rd_stage_task_owners (
  id, task_id, project_id, item_id, user_id, user_name, status, progress,
  started_at, completed_at, created_at, updated_at
)
SELECT
  owner_id, task_id, project_id, item_id, user_id, user_name, status, progress,
  started_at, completed_at, created_at, created_at
FROM tmp_rd_stage_task_baseline_backfill;

DROP TABLE tmp_rd_stage_task_baseline_backfill;
