import type {
    CheckRootResultDto,
    DetectResultDto,
    ImportCheckResultDto,
    PackageManagerDto,
    ProjectAssetSourceSvnDto,
    ProjectAssetsDto,
    ProjectDto,
    ProjectFrameworkDto,
} from "@yinuo-ngm/protocol";

export type ProjectFramework = ProjectFrameworkDto;

export type PackageManager = PackageManagerDto;

export type Project = ProjectDto;

export type CheckRootResult = CheckRootResultDto;

export type ImportCheckResult = ImportCheckResultDto;

export type DetectResult = DetectResultDto;

export type ProjectHubV2ConfigDraft = {
    baseUrl: string;
    projectKey: string;
    token: string;
};

export type EditingProjectDraft = {
    id: string;
    name: string;
    repoPageUrl?: string;
    description?: string;
    hubV2: ProjectHubV2ConfigDraft;
};

/**
 * 工程资源来源 - SVN
 * - 目前先只做 SVN，未来可扩展 Git/HTTP 等
 */
export type ProjectAssetSourceSvn = ProjectAssetSourceSvnDto;

/**
 * 工程相关的资源，如图标、设计稿等，可能来自不同的源（svn/git/http等），先定义一个通用接口，后续根据需要扩展
 */
export type ProjectAssets = ProjectAssetsDto;


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
