import type { PageResult } from "../../shared/http/pagination";

export type AnnouncementScope = "global" | "project";
export type AnnouncementStatus = "draft" | "published" | "archived";

export interface AnnouncementEntity {
  id: string;
  projectId: string | null;
  title: string;
  summary: string | null;
  contentMd: string;
  scope: AnnouncementScope;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt: string | null;
  expireAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  projectId?: string | null;
  title: string;
  summary?: string;
  contentMd: string;
  scope?: AnnouncementScope;
  pinned?: boolean;
  expireAt?: string;
}

export interface UpdateAnnouncementInput {
  projectId?: string | null;
  title?: string;
  summary?: string;
  contentMd?: string;
  scope?: AnnouncementScope;
  pinned?: boolean;
  expireAt?: string | null;
}

export interface ListAnnouncementsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AnnouncementStatus;
  projectId?: string;
}

export type AnnouncementListResult = PageResult<AnnouncementEntity>;
