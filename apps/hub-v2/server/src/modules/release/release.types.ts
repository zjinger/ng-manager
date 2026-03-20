import type { PageResult } from "../../shared/http/pagination";

export type ReleaseStatus = "draft" | "published" | "archived";

export interface ReleaseEntity {
  id: string;
  projectId: string | null;
  channel: string;
  version: string;
  title: string;
  notes: string | null;
  downloadUrl: string | null;
  status: ReleaseStatus;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  projectId?: string | null;
  channel: string;
  version: string;
  title: string;
  notes?: string;
  downloadUrl?: string;
}

export interface UpdateReleaseInput {
  projectId?: string | null;
  channel?: string;
  version?: string;
  title?: string;
  notes?: string | null;
  downloadUrl?: string | null;
}

export interface ListReleasesQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: ReleaseStatus;
  projectId?: string;
  channel?: string;
}

export type ReleaseListResult = PageResult<ReleaseEntity>;
