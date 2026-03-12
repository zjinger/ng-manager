export type ProjectStatus = 'active' | 'archived';
export type ProjectVisibility = 'internal' | 'public';
export type ProjectMemberRole = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops';

export interface ProjectItem {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  memberCount: number;
  updatedAt: string;
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
}

export interface UserOptionItem {
  id: string;
  username: string;
  displayName: string | null;
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
