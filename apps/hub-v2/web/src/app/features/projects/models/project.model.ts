export type ProjectMemberRole = 'member' | 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'project_admin';

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";
export type ProjectType = 'entrust_dev' | 'self_dev' | 'tech_service';
export type ProjectModuleNodeType = 'subsystem' | 'module';

export const PROJECT_TYPE_OPTIONS: Array<{ label: string; value: ProjectType }> = [
  { label: '受托研发', value: 'entrust_dev' },
  { label: '自主研发', value: 'self_dev' },
  { label: '技术服务', value: 'tech_service' },
];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  entrust_dev: '受托研发',
  self_dev: '自主研发',
  tech_service: '技术服务',
};

export interface ProjectSummary {
  id: string;
  projectKey: string;
  projectNo: string;
  displayCode: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  projectType: ProjectType;
  contractNo: string | null;
  deliveryDate: string | null;
  productLine: string | null;
  slaLevel: string | null;
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
  projectNo: string;
  projectType: ProjectType;
  displayCode?: string;
  description?: string;
  icon?: string;
  avatarUploadId?: string;
  contractNo?: string;
  deliveryDate?: string;
  productLine?: string;
  slaLevel?: string;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectInput {
  name?: string;
  projectNo?: string;
  projectType?: ProjectType;
  displayCode?: string | null;
  description?: string | null;
  icon?: string | null;
  avatarUploadId?: string | null;
  contractNo?: string | null;
  deliveryDate?: string | null;
  productLine?: string | null;
  slaLevel?: string | null;
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
  projectNo?: string | null;
  parentId: string | null;
  parentName?: string | null;
  nodeType: ProjectModuleNodeType;
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
  projectNo?: string;
  parentId?: string | null;
  nodeType?: ProjectModuleNodeType;
  enabled?: boolean;
  sort?: number;
  description?: string;
}

export interface UpdateProjectMetaItemInput {
  name?: string;
  code?: string | null;
  projectNo?: string | null;
  parentId?: string | null;
  nodeType?: ProjectModuleNodeType;
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
