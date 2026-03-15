export type ProjectStatus = "active" | "archived";
export type ProjectVisibility = "internal" | "public";
export type ProjectMemberRole =
  | "product"
  | "ui"
  | "frontend_dev"
  | "backend_dev"
  | "qa"
  | "ops"
  | "project_admin";

export interface ProjectEntity {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends ProjectEntity {
  memberCount: number;
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
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
}

export interface ListProjectQuery {
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface ProjectListResult {
  items: ProjectListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProjectMemberEntity {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roles: ProjectMemberRole[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectMemberInput {
  projectId: string;
  userId: string;
  roles: ProjectMemberRole[];
}

export interface UpdateProjectMemberInput {
  roles?: ProjectMemberRole[];
}

export interface ProjectConfigItemEntity {
  id: string;
  projectId: string;
  name: string;
  code: string | null;
  enabled: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersionItemEntity {
  id: string;
  projectId: string;
  version: string;
  code: string | null;
  enabled: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectConfigItemInput {
  name: string;
  code?: string;
  enabled?: boolean;
  sort?: number;
}

export interface UpdateProjectConfigItemInput {
  name?: string;
  code?: string | null;
  enabled?: boolean;
  sort?: number;
}

export interface CreateProjectVersionItemInput {
  version: string;
  code?: string;
  enabled?: boolean;
  sort?: number;
}

export interface UpdateProjectVersionItemInput {
  version?: string;
  code?: string | null;
  enabled?: boolean;
  sort?: number;
}
