import type { PageResult } from "../../shared/http/pagination";

export type SkillStatus = "draft" | "published" | "archived";
export type SkillVersionStatus = "draft" | "submitted" | "published" | "rejected" | "archived";

export interface SkillEntity {
  id: string;
  slug: string;
  name: string;
  description: string;
  descriptionMd: string;
  category: string;
  tags: string[];
  ownerUserId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  status: SkillStatus;
  latestVersionId: string | null;
  latestVersion: string | null;
  latestPublishedAt: string | null;
  favoriteCount: number;
  reviewCount: number;
  ratingAverage: number | null;
  pendingReviewCount: number;
  isFavorited: boolean;
  myRating: number | null;
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

export interface SkillCommentEntity {
  id: string;
  skillId: string;
  authorId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillPackageManifest {
  name: string;
  description: string;
  rootPrefix: string;
  files: Array<{ path: string; size: number; content?: string | null; contentTruncated?: boolean }>;
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
  name?: string;
  version?: string;
  category?: string;
  tags?: string[];
  descriptionMd?: string;
}

export interface CreateSkillInput extends SkillUploadInput {
  slug?: string;
}

export interface CreateSkillVersionInput extends SkillUploadInput {}

export interface RejectSkillVersionInput {
  reviewComment: string;
}

export interface ReviewSkillInput {
  rating: number;
  comment?: string;
}

export interface UpdateSkillInput {
  category?: string;
  tags?: string[];
  descriptionMd?: string;
}

export interface CreateSkillCommentInput {
  content: string;
}

export interface SkillDiscoveryMeta {
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

export type SkillExportTarget = "codex" | "claude" | "opencode";

export interface SkillExportConfig {
  target: SkillExportTarget;
  fileName: string;
  contentType: "application/json" | "text/markdown";
  content: string;
}

export interface ListSkillsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  tag?: string;
  status?: SkillStatus | "active" | "submitted" | "";
  sort?: "updated" | "hot" | "rating";
}

export type SkillListResult = PageResult<SkillEntity>;
