import type { PageResult } from "../../shared/http/pagination";

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";

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
  roleCode: string;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  projectKey: string;
  name: string;
  description?: string;
  icon?: string;
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
  roleCode?: string;
  isOwner?: boolean;
}

export type ProjectListResult = PageResult<ProjectEntity>;
