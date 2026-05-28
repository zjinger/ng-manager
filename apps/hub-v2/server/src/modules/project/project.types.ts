import type { PageResult } from "../../shared/http/pagination";

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";
export type ProjectType = "entrust_dev" | "self_dev" | "tech_service";
export type ProjectFeaturePointStatus = "todo" | "designing" | "developing" | "testing" | "done";
export type ProjectFeatureProgressTargetType = "project" | "module";

export interface ProjectFeatureProgressStatusOption {
  key: ProjectFeaturePointStatus;
  label: string;
  progress: number;
}

export const DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS: ProjectFeatureProgressStatusOption[] = [
  { key: "todo", label: "未开始", progress: 0 },
  { key: "designing", label: "设计中", progress: 10 },
  { key: "developing", label: "开发中", progress: 50 },
  { key: "testing", label: "测试中", progress: 90 },
  { key: "done", label: "已完成", progress: 100 }
];
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
  defaultProjectTitleCode: ProjectMemberRole | null;
  defaultProjectTitleName: string | null;
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

export interface ProjectFeatureProgressSettings {
  projectId: string;
  enabled: boolean;
  statusOptions: ProjectFeatureProgressStatusOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeaturePointEntity {
  id: string;
  projectId: string;
  moduleId: string | null;
  moduleGroupId: string | null;
  submoduleGroupId: string | null;
  groupTitle?: string | null;
  moduleName?: string | null;
  submoduleName?: string | null;
  ownerUserId: string | null;
  ownerName?: string | null;
  ownerUserIds: string[];
  ownerNames: string[];
  name: string;
  status: ProjectFeaturePointStatus;
  progress: number;
  enabled: boolean;
  sort: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeaturePointGroupEntity {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  manualProgress: number | null;
  sort: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeatureProgressOverrideEntity {
  id: string;
  projectId: string;
  targetType: ProjectFeatureProgressTargetType;
  targetId: string;
  progress: number;
  remark: string | null;
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

export interface UpdateProjectFeatureProgressSettingsInput {
  enabled?: boolean;
  statusOptions?: ProjectFeatureProgressStatusOption[];
}

export interface CreateProjectFeaturePointInput {
  name: string;
  moduleId?: string | null;
  moduleGroupId?: string | null;
  submoduleGroupId?: string | null;
  groupTitle?: string | null;
  moduleName?: string | null;
  submoduleName?: string | null;
  ownerUserId?: string | null;
  ownerUserIds?: string[];
  status?: ProjectFeaturePointStatus;
  progress?: number;
  enabled?: boolean;
  sort?: number;
  remark?: string | null;
}

export interface UpdateProjectFeaturePointInput {
  name?: string;
  moduleId?: string | null;
  moduleGroupId?: string | null;
  submoduleGroupId?: string | null;
  groupTitle?: string | null;
  moduleName?: string | null;
  submoduleName?: string | null;
  ownerUserId?: string | null;
  ownerUserIds?: string[];
  status?: ProjectFeaturePointStatus;
  progress?: number;
  enabled?: boolean;
  sort?: number;
  remark?: string | null;
}

export interface CreateProjectFeaturePointGroupInput {
  name: string;
  parentId?: string | null;
  manualProgress?: number | null;
  sort?: number;
  remark?: string | null;
}

export interface UpdateProjectFeaturePointGroupInput {
  name?: string;
  parentId?: string | null;
  manualProgress?: number | null;
  sort?: number;
  remark?: string | null;
}

export interface UpsertProjectFeatureProgressOverrideInput {
  targetType: ProjectFeatureProgressTargetType;
  targetId: string;
  progress: number;
  remark?: string | null;
}

export interface DeleteProjectFeatureProgressOverrideInput {
  targetType: ProjectFeatureProgressTargetType;
  targetId: string;
}

export interface ProjectFeatureProgressMetric {
  computedProgress: number;
  manualProgress: number | null;
  overrideProgress: number | null;
  displayProgress: number;
  overrideRemark: string | null;
}

export interface ProjectFeatureProgressSummary extends ProjectFeatureProgressMetric {
  projectId: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

export interface ProjectFeatureProgressModuleNode extends ProjectFeatureProgressMetric {
  id: string;
  projectId: string;
  name: string;
  code: string | null;
  nodeType: "subsystem" | "module";
  parentId: string | null;
  parentName?: string | null;
  sort: number;
  featureCount: number;
  children: ProjectFeatureProgressModuleNode[];
  featurePoints: ProjectFeaturePointEntity[];
}

export interface ProjectFeatureProgressView {
  projectId: string;
  enabled: boolean;
  settings: ProjectFeatureProgressSettings;
  summary: ProjectFeatureProgressSummary;
  modules: ProjectFeatureProgressModuleNode[];
  ungrouped: {
    id: "ungrouped";
    name: string;
    computedProgress: number;
    manualProgress: null;
    overrideProgress: null;
    displayProgress: number;
    overrideRemark: null;
    featureCount: number;
    featurePoints: ProjectFeaturePointEntity[];
  };
}

export interface ProjectFeatureProgressNodePatch {
  id: string;
  name: string;
  computedProgress: number;
  manualProgress: number | null;
  displayProgress: number;
  overrideRemark: string | null;
  sort: number;
}

export interface ProjectFeatureProgressSectionPatch {
  key: string;
  title: string;
  progress: number;
  completedCount: number;
  featureCount: number;
  groupCount: number;
}

export interface ProjectFeaturePointGroupUpdateResult {
  group: ProjectFeaturePointGroupEntity;
  summary: ProjectFeatureProgressSummary;
  nodes: ProjectFeatureProgressNodePatch[];
  sections: ProjectFeatureProgressSectionPatch[];
}

export interface AddProjectModuleMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole;
}

export interface ProjectModuleRdLinkEntity {
  id: string;
  projectId: string;
  moduleId: string;
  rdItemId: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
  rdNo: string | null;
  rdTitle: string | null;
  rdStatus: string | null;
}

export interface ReplaceModuleRdLinksInput {
  rdItemIds: string[];
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
