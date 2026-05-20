/**
 * 项目治理权限
 * 
 * 权限列表：
 * - project.create: 创建项目
 * - project.manage: 管理项目（编辑、删除等）
 * - project.read.all: 读取所有项目
 * - project.manage.all: 管理所有项目
 * - project.archive: 归档项目
 * - project.owner.transfer: 转移项目所有权
 */
export const PROJECT_GOVERNANCE_PERMISSIONS = [
  'project.create',
  'project.manage',
  'project.read.all',
  'project.manage.all',
  'project.archive',
  'project.owner.transfer',
] as const;

