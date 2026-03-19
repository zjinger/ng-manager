export type ProjectStatus = 'active' | 'archived';
export type ProjectVisibility = 'internal' | 'public';
export type ProjectMemberRole = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'project_admin';

export interface ProjectItem {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  memberCount: number;
  updatedAt: string;
  currentUserCanManage?: boolean;
}

export interface ProjectListResult {
  items: ProjectItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProjectMemberItem {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roles: ProjectMemberRole[];
  avatarUrl: string | null;
}

export interface UserOptionItem {
  id: string;
  username: string;
  displayName: string | null;
  titleCode: string | null;
}

export interface ProjectConfigItem {
  id: string;
  projectId: string;
  name: string;
  enabled: boolean;
  sort: number;
}

export interface ProjectVersionItem {
  id: string;
  projectId: string;
  version: string;
  enabled: boolean;
  sort: number;
}


export function roleLabel(role: ProjectMemberRole): string {
  if (role === 'product') return '产品';
  if (role === 'ui') return 'UI/设计';
  if (role === 'frontend_dev') return '前端开发';
  if (role === 'backend_dev') return '后端开发';
  if (role === 'qa') return '测试';
  if (role === 'ops') return '运维/环境支持';
  if (role === 'project_admin') return '项目管理员';
  return role;
}