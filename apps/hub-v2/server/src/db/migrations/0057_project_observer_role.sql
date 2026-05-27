-- [0057] 项目观察员内置角色
-- Depends on: 0042_system_rbac, 0045_project_rbac
-- Notes: 用于领导或观察者查看全部项目情况，不授予项目写入、归档、成员管理或 owner 转移能力

INSERT OR IGNORE INTO system_roles (
  id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at
)
VALUES (
  'srole_project_observer',
  'project_observer',
  '项目观察员',
  '可查看全部项目情况，但不具备项目写入和操作能力。',
  1,
  'project',
  '项目治理角色',
  'active',
  80,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_project_observer', id, datetime('now')
FROM system_permissions
WHERE code = 'project.read.all';
