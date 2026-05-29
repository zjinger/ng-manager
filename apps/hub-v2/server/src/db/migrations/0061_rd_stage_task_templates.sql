CREATE TABLE IF NOT EXISTS rd_stage_task_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES rd_stages(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rd_stage_task_templates_stage_title
  ON rd_stage_task_templates(stage_id, title);

CREATE INDEX IF NOT EXISTS idx_rd_stage_task_templates_project_stage
  ON rd_stage_task_templates(project_id, stage_id, sort_order ASC);

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'requirement_confirmation', '需求梳理', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '需求确认'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '需求梳理');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'requirement_confirmation', '需求评审', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '需求确认'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '需求评审');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'requirement_confirmation', '需求确认', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '需求确认'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '需求确认');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'solution_design', 'UI 原型设计', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '方案设计'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = 'UI 原型设计');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'solution_design', '交互设计确认', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '方案设计'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '交互设计确认');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'solution_design', '数据库设计', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '方案设计'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '数据库设计');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_04', s.project_id, s.id, 'solution_design', '接口方案设计', NULL, 40, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '方案设计'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '接口方案设计');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_05', s.project_id, s.id, 'solution_design', '技术方案评审', NULL, 50, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '方案设计'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '技术方案评审');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'feature_dev', '后端接口开发', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '功能开发'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '后端接口开发');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'feature_dev', '前端页面开发', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '功能开发'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '前端页面开发');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'feature_dev', '权限控制开发', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '功能开发'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '权限控制开发');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_04', s.project_id, s.id, 'feature_dev', '前后端联调', NULL, 40, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '功能开发'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '前后端联调');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'testing_validation', '测试用例编写', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '测试验证'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '测试用例编写');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'testing_validation', '功能测试', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '测试验证'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '功能测试');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'testing_validation', '缺陷修复', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '测试验证'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '缺陷修复');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_04', s.project_id, s.id, 'testing_validation', '回归测试', NULL, 40, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '测试验证'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '回归测试');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'delivery_launch', '部署准备', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '交付上线'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '部署准备');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'delivery_launch', '上线发布', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '交付上线'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '上线发布');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'delivery_launch', '上线验证', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '交付上线'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '上线验证');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_01', s.project_id, s.id, 'project_closure', '资料归档', NULL, 10, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '项目结项'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '资料归档');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_02', s.project_id, s.id, 'project_closure', '复盘总结', NULL, 20, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '项目结项'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '复盘总结');

INSERT INTO rd_stage_task_templates (
  id, project_id, stage_id, stage_key, title, description, sort_order, enabled, created_at, updated_at
)
SELECT 'rdstpl_' || s.id || '_03', s.project_id, s.id, 'project_closure', '结项确认', NULL, 30, 1, datetime('now'), datetime('now')
FROM rd_stages s
WHERE s.name = '项目结项'
  AND NOT EXISTS (SELECT 1 FROM rd_stage_task_templates t WHERE t.stage_id = s.id AND t.title = '结项确认');
