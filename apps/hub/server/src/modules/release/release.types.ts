export type ReleaseChannel = "desktop" | "cli";
export type ReleaseStatus = "draft" | "published" | "deprecated";

export interface ReleaseEntity {
  id: string;
  projectId?: string | null;
  channel: ReleaseChannel;
  version: string;
  title: string;
  notes?: string | null;
  downloadUrl?: string | null;
  status: ReleaseStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  projectId?: string | null;
  channel: ReleaseChannel;
  version: string;
  title: string;
  notes?: string;
  downloadUrl?: string;
}

export interface UpdateReleaseInput {
  projectId?: string | null;
  channel?: ReleaseChannel;
  version?: string;
  title?: string;
  notes?: string | null;
  downloadUrl?: string | null;
  status?: ReleaseStatus;
}

export interface ListReleaseQuery {
  projectId?: string;
  channel?: ReleaseChannel;
  status?: ReleaseStatus;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface ReleaseListResult {
  items: ReleaseEntity[];
  page: number;
  pageSize: number;
  total: number;
}