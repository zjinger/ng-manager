export type AuditLogModule = 'user' | 'organization' | 'title' | 'role' | 'permission' | 'settings';
export type AuditLogAction = 'create' | 'update' | 'delete' | 'enable' | 'disable' | 'reset' | 'assign' | 'remove';
export type AuditLogLevel = 'info' | 'warn' | 'error';

export interface AuditLogEntity {
  id: string;
  module: AuditLogModule;
  action: AuditLogAction;
  level: AuditLogLevel;
  actorId: string | null;
  actorName: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  summary: string;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface AuditLogListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  module?: AuditLogModule;
  action?: AuditLogAction;
  level?: AuditLogLevel;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogListResult {
  items: AuditLogEntity[];
  page: number;
  pageSize: number;
  total: number;
}

export const AUDIT_MODULE_LABELS: Record<AuditLogModule, string> = {
  user: '用户管理',
  organization: '部门组织',
  title: '职务管理',
  role: '角色管理',
  permission: '权限项',
  settings: '系统设置',
};

export const AUDIT_ACTION_LABELS: Record<AuditLogAction, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  enable: '启用',
  disable: '停用',
  reset: '重置',
  assign: '分配',
  remove: '移除',
};

export const AUDIT_LEVEL_LABELS: Record<AuditLogLevel, string> = {
  info: '信息',
  warn: '警告',
  error: '错误',
};
