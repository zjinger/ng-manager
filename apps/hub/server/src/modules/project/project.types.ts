export type ProjectStatus = "active" | "archived";
export type ProjectVisibility = "internal" | "public";
export type ProjectMemberRole =
  | "product"
  | "ui"
  | "frontend_dev"
  | "backend_dev"
  | "qa"
  | "ops";

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
  items: ProjectEntity[];
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
  displayName: string;
  roles: ProjectMemberRole[];
}

export interface UpdateProjectMemberInput {
  displayName?: string;
  roles?: ProjectMemberRole[];
}
