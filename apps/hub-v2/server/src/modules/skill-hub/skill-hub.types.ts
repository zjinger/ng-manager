import type { PageResult } from "../../shared/http/pagination";

export type SkillStatus = "draft" | "published" | "archived";
export type SkillVersionStatus = "draft" | "submitted" | "published" | "rejected" | "archived";

export interface SkillEntity {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  ownerUserId: string | null;
  ownerName: string | null;
  status: SkillStatus;
  latestVersionId: string | null;
  latestVersion: string | null;
  latestPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersionEntity {
  id: string;
  skillId: string;
  version: string;
  status: SkillVersionStatus;
  manifest: SkillPackageManifest;
  readmeMd: string;
  packageUploadId: string;
  checksum: string | null;
  fileCount: number;
  packageSize: number;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewComment: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetailEntity extends SkillEntity {
  versions: SkillVersionEntity[];
}

export interface SkillPackageManifest {
  name: string;
  description: string;
  rootPrefix: string;
  files: Array<{ path: string; size: number }>;
  validation: {
    skillMdPath: string;
    fileCount: number;
    packageSize: number;
  };
}

export interface SkillUploadInput {
  packageUploadId: string;
  packagePath: string;
  packageSize: number;
  checksum?: string | null;
  version?: string;
  category?: string;
  tags?: string[];
}

export interface CreateSkillInput extends SkillUploadInput {
  slug?: string;
}

export interface CreateSkillVersionInput extends SkillUploadInput {}

export interface RejectSkillVersionInput {
  reviewComment: string;
}

export interface ListSkillsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  tag?: string;
  status?: SkillStatus | "active" | "";
}

export type SkillListResult = PageResult<SkillEntity>;
