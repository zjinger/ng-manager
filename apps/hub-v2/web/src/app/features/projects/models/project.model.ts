export type ProjectMemberRole = 'member' | 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'project_admin';
export type ProjectModulePriority = 'critical' | 'high' | 'medium' | 'low';
export type ProjectModuleStatus = 'todo' | 'in_progress' | 'released' | 'paused';

export type ProjectStatus = "active" | "inactive";
export type ProjectVisibility = "internal" | "private";
export type ProjectType = 'entrust_dev' | 'self_dev' | 'tech_service';
export type ProjectModuleNodeType = 'subsystem' | 'module';
export type ProjectFeaturePointStatus = 'todo' | 'designing' | 'developing' | 'testing' | 'done';
export type ProjectFeatureProgressTargetType = 'project' | 'module';

export interface ProjectFeatureProgressStatusOption {
  key: ProjectFeaturePointStatus;
  label: string;
  progress: number;
}

export const DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS: ProjectFeatureProgressStatusOption[] = [
  { key: 'todo', label: '未开始', progress: 0 },
  { key: 'designing', label: '设计中', progress: 10 },
  { key: 'developing', label: '开发中', progress: 50 },
  { key: 'testing', label: '测试中', progress: 90 },
  { key: 'done', label: '已完成', progress: 100 },
];

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
  favoriteAt?: string | null;
  isMember?: boolean;
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

export interface UpdateProjectFavoriteInput {
  favorite: boolean;
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
  defaultProjectTitleCode: ProjectMemberRole | null;
  defaultProjectTitleName: string | null;
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
  ownerUserId?: string | null;
  ownerName?: string | null;
  iconCode?: string | null;
  priority?: ProjectModulePriority;
  status?: ProjectModuleStatus;
  progress?: number;
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

export interface ProjectFeatureProgressSettings {
  projectId: string;
  enabled: boolean;
  statusOptions: ProjectFeatureProgressStatusOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeaturePoint {
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

export interface ProjectFeaturePointGroup {
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

export interface CreateProjectMetaItemInput {
  name: string;
  code?: string;
  projectNo?: string;
  parentId?: string | null;
  nodeType?: ProjectModuleNodeType;
  ownerUserId?: string | null;
  iconCode?: string;
  priority?: ProjectModulePriority;
  status?: ProjectModuleStatus;
  progress?: number;
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
  ownerUserId?: string | null;
  iconCode?: string | null;
  priority?: ProjectModulePriority;
  status?: ProjectModuleStatus;
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
  nodeType: ProjectModuleNodeType;
  parentId: string | null;
  parentName?: string | null;
  sort: number;
  featureCount: number;
  children: ProjectFeatureProgressModuleNode[];
  featurePoints: ProjectFeaturePoint[];
}

export interface ProjectFeatureProgressView {
  projectId: string;
  enabled: boolean;
  settings: ProjectFeatureProgressSettings;
  summary: ProjectFeatureProgressSummary;
  modules: ProjectFeatureProgressModuleNode[];
  ungrouped: {
    id: 'ungrouped';
    name: string;
    computedProgress: number;
    manualProgress: null;
    overrideProgress: null;
    displayProgress: number;
    overrideRemark: null;
    featureCount: number;
    featurePoints: ProjectFeaturePoint[];
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
  group: ProjectFeaturePointGroup;
  summary: ProjectFeatureProgressSummary;
  nodes: ProjectFeatureProgressNodePatch[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
}

export interface ProjectFeatureProgressIncrementalResult {
  summary: ProjectFeatureProgressSummary;
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  affectedFeaturePoints?: ProjectFeaturePoint[];
  removedFeaturePointIds?: string[];
  affectedGroupIds?: string[];
  removedGroupIds?: string[];
  projectOverride?: ProjectFeatureProgressOverrideEntity | null;
}

export interface ProjectFeaturePointUpdateResult extends ProjectFeatureProgressIncrementalResult {
  featurePoint: ProjectFeaturePoint;
}

export interface ProjectFeatureProgressOverrideUpdateResult extends ProjectFeatureProgressIncrementalResult {
  override: ProjectFeatureProgressOverrideEntity;
}

export interface ProjectFeatureProgressOverrideDeleteResult extends ProjectFeatureProgressIncrementalResult {
  removedOverride: {
    targetType: ProjectFeatureProgressTargetType;
    targetId: string;
  };
}

export interface ProjectModuleMemberEntity {
  id: string;
  projectId: string;
  moduleId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  roleCode: ProjectMemberRole;
  source: 'project' | 'module';
  isInherited: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddProjectModuleMemberInput {
  userId: string;
  roleCode?: ProjectMemberRole | 'member';
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

export type ProjectApiTokenScope = 'issues:read' | 'rd:read' | 'feedbacks:read' | 'docs:read';
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

export type MobileAppPlatform = 'android' | 'ios';

export interface ProjectMobileAppPlatformConfig {
  platform: MobileAppPlatform;
  enabled: boolean;
  packageUploadId: string | null;
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  downloadUrl: string | null;
  qrCodeUrl: string | null;
  packageSizeBytes: number | null;
  minOsVersion: string | null;
  checksum: {
    sha256: string | null;
    md5: string | null;
  };
  distributionType: string | null;
  forceUpdate: boolean;
  gray: boolean;
  minSupportedVersion: string | null;
}

export interface ProjectMobileAppReleaseNote {
  id: string;
  version: string;
  title: string;
  publishedAt: string | null;
  summary: string[];
  importantNotes: string[];
  downloadUrl: string | null;
}

export interface ProjectMobileAppConfig {
  enabled: boolean;
  app: {
    name: string;
    title: string;
    subtitle: string;
    description: string;
    channel: string;
  };
  current: {
    versionName: string | null;
    versionCode: number | null;
    publishedAt: string | null;
    channel: string;
    packageSizeBytes: number | null;
    minOsVersion: string | null;
    forceUpdate: boolean;
    gray: boolean;
    minSupportedVersion: string | null;
  };
  platforms: ProjectMobileAppPlatformConfig[];
  releaseNotes: ProjectMobileAppReleaseNote[];
  installSteps: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
  support: {
    owner: string;
    contact: string | null;
    docsUrl: string | null;
  };
  cache: {
    maxAgeSeconds: number;
  };
  configured: boolean;
  downloadPageUrl: string;
  source: {
    configKey: string | null;
    releaseChannel: string;
  };
}

export interface UpdateProjectMobileAppConfigInput {
  enabled?: boolean;
  app?: Partial<ProjectMobileAppConfig['app']>;
  current?: Partial<ProjectMobileAppConfig['current']>;
  platforms?: ProjectMobileAppPlatformConfig[];
  releaseNotes?: ProjectMobileAppReleaseNote[];
  installSteps?: Array<{ title: string; description: string }>;
  faq?: Array<{ question: string; answer: string }>;
  support?: Partial<ProjectMobileAppConfig['support']>;
  cache?: Partial<ProjectMobileAppConfig['cache']>;
  releaseChannel?: string;
}
