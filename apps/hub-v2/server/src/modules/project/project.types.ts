import type { PageResult } from "../../shared/http/pagination";

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";
export type ProjectMemberRole =
  | "member"
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
  description: string | null;
  icon: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
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

export interface ListProjectsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: ProjectStatus;
}

export interface AddProjectMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole;
  isOwner?: boolean;
}

export interface ProjectMemberCandidate {
  id: string;
  username: string;
  displayName: string | null;
}

export interface ProjectConfigItemEntity {
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

export interface ProjectVersionItemEntity {
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

export interface CreateProjectConfigItemInput {
  name: string;
  code?: string;
  enabled?: boolean;
  sort?: number;
  description?: string;
}

export interface UpdateProjectConfigItemInput {
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

export type ProjectListResult = PageResult<ProjectEntity>;
