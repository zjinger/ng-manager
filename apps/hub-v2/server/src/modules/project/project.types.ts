import type { PageResult } from "../../shared/http/pagination";

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";
export type ProjectType = "entrust_dev" | "self_dev" | "tech_service";
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
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  roleCode: ProjectMemberRole;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
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
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
}

export interface ListProjectsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: ProjectStatus;
  scope?: "all_accessible" | "member_only";
}

export interface AddProjectMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole;
  isOwner?: boolean;
}

export interface UpdateProjectMemberInput {
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
  projectNo?: string | null;
  parentId: string | null;
  parentName?: string | null;
  nodeType: "subsystem" | "module";
  ownerUserId?: string | null;
  ownerName?: string | null;
  iconCode?: string | null;
  priority?: "critical" | "high" | "medium" | "low";
  status?: "todo" | "in_progress" | "released" | "paused";
  progress?: number;
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
  projectNo?: string;
  parentId?: string | null;
  nodeType?: "subsystem" | "module";
  ownerUserId?: string | null;
  iconCode?: string;
  priority?: "critical" | "high" | "medium" | "low";
  status?: "todo" | "in_progress" | "released" | "paused";
  progress?: number;
  enabled?: boolean;
  sort?: number;
  description?: string;
}

export interface UpdateProjectConfigItemInput {
  name?: string;
  code?: string | null;
  projectNo?: string | null;
  parentId?: string | null;
  nodeType?: "subsystem" | "module";
  ownerUserId?: string | null;
  iconCode?: string | null;
  priority?: "critical" | "high" | "medium" | "low";
  status?: "todo" | "in_progress" | "released" | "paused";
  progress?: number;
  enabled?: boolean;
  sort?: number;
  description?: string | null;
}

export interface AddProjectModuleMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole;
}

export interface ProjectModuleMemberEntity {
  id: string;
  projectId: string;
  moduleId: string;
  userId: string;
  displayName: string;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  roleCode: ProjectMemberRole;
  source: "project" | "module";
  isInherited: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
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
