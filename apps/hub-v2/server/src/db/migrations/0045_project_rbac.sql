-- [0045] 项目治理权限码补充（并入 system_permissions）
-- Depends on: 0042_system_rbac
-- Notes: 项目 owner/管理员的运行时规则仍由项目治理逻辑判定
INSERT OR IGNORE INTO system_permissions (
  id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at
)
VALUES
  ('sperm_project_manage', 'project.manage', '管理项目', 'project', '项目管理', 'project', '项目管理', '允许创建项目，并管理自己创建或负责的项目。', 10, datetime('now'), datetime('now')),
  ('sperm_project_read_all', 'project.read.all', '查看全部项目', 'project', '项目管理', 'project', '项目管理', '允许读取全部项目，包括 private 项目。', 20, datetime('now'), datetime('now')),
  ('sperm_project_manage_all', 'project.manage.all', '管理全部项目', 'project', '项目管理', 'project', '项目管理', '允许管理任意项目的成员与配置。', 30, datetime('now'), datetime('now')),
  ('sperm_project_archive', 'project.archive', '归档项目', 'project', '项目管理', 'project', '项目管理', '允许切换项目活跃与归档状态。', 40, datetime('now'), datetime('now')),
  ('sperm_project_owner_transfer', 'project.owner.transfer', '转移项目拥有者', 'project', '项目管理', 'project', '项目管理', '允许转移任意项目 owner。', 50, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('project.manage', 'project.read.all', 'project.manage.all', 'project.archive', 'project.owner.transfer');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('project.manage', 'project.read.all', 'project.manage.all', 'project.archive', 'project.owner.transfer');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_member', id, datetime('now')
FROM system_permissions
WHERE code IN ('project.manage');
