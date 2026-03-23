export type ProjectMemberRole = 'member' | 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'project_admin';

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";

export interface ProjectSummary {
  id: string;
  projectKey: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: ProjectStatus | '';
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon?: string;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
}

export interface AddProjectMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole | 'member';
  isOwner?: boolean;
}

export interface ProjectMemberEntity {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roleCode: ProjectMemberRole;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberCandidate {
  id: string;
  username: string;
  displayName: string | null;
}

export interface ProjectMetaItem {
  id: string;
  projectId: string;
  name: string;
  code: string | null;
  enabled: boolean;
  sort: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersionItem {
  id: string;
  projectId: string;
  version: string;
  code: string | null;
  enabled: boolean;
  sort: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectMetaItemInput {
  name: string;
  code?: string;
  enabled?: boolean;
  sort?: number;
  description?: string;
}

export interface UpdateProjectMetaItemInput {
  name?: string;
  code?: string | null;
  enabled?: boolean;
  sort?: number;
  description?: string | null;
}

export interface CreateProjectVersionItemInput {
  version: string;
  code?: string;
  enabled?: boolean;
  sort?: number;
  description?: string;
}

export interface UpdateProjectVersionItemInput {
  version?: string;
  code?: string | null;
  enabled?: boolean;
  sort?: number;
  description?: string | null;
}
