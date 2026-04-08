export type ProjectMemberRole = 'member' | 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'project_admin';

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";

export interface ProjectSummary {
  id: string;
  projectKey: string;
  displayCode: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  memberCount?: number;
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
  scope?: 'all_accessible' | 'member_only';
}

export interface CreateProjectInput {
  name: string;
  displayCode?: string;
  description?: string;
  icon?: string;
  avatarUploadId?: string;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectInput {
  name?: string;
  displayCode?: string | null;
  description?: string | null;
  icon?: string | null;
  avatarUploadId?: string | null;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
}

export interface AddProjectMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole | 'member';
  isOwner?: boolean;
}

export interface UpdateProjectMemberInput {
  roleCode?: ProjectMemberRole | 'member';
  isOwner?: boolean;
}

export interface ProjectMemberEntity {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roleCode: ProjectMemberRole;
  avatarUrl: string | null;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberCandidate {
  id: string;
  username: string;
  displayName: string | null;
  titleCode: ProjectMemberRole | null;
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

export type ProjectApiTokenScope = 'issues:read' | 'rd:read' | 'feedbacks:read';
export type ProjectApiTokenStatus = 'active' | 'revoked';

export interface ProjectApiTokenEntity {
  id: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  scopes: ProjectApiTokenScope[];
  status: ProjectApiTokenStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectApiTokenInput {
  name: string;
  scopes: ProjectApiTokenScope[];
  expiresAt?: string | null;
}

export interface CreateProjectApiTokenResult {
  token: string;
  entity: ProjectApiTokenEntity;
}
