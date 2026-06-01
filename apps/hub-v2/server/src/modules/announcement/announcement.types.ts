import type { PageResult } from "../../shared/http/pagination";

export type AnnouncementScope = "global" | "project";
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementDomain = "content" | "reimbursement";

export interface AnnouncementEntity {
  id: string;
  projectId: string | null;
  domain: AnnouncementDomain;
  title: string;
  summary: string | null;
  contentMd: string;
  scope: AnnouncementScope;
  pinned: boolean;
  effectiveAt: string | null;
  notifyRelatedUsers: boolean;
  status: AnnouncementStatus;
  publishAt: string | null;
  expireAt: string | null;
  createdBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  projectId?: string | null;
  domain?: AnnouncementDomain;
  title: string;
  summary?: string;
  contentMd: string;
  scope?: AnnouncementScope;
  pinned?: boolean;
  effectiveAt?: string;
  notifyRelatedUsers?: boolean;
  expireAt?: string;
}

export interface UpdateAnnouncementInput {
  projectId?: string | null;
  domain?: AnnouncementDomain;
  title?: string;
  summary?: string;
  contentMd?: string;
  scope?: AnnouncementScope;
  pinned?: boolean;
  effectiveAt?: string | null;
  notifyRelatedUsers?: boolean;
  expireAt?: string | null;
}

export interface ListAnnouncementsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AnnouncementStatus;
  domain?: AnnouncementDomain;
  scope?: AnnouncementScope;
  projectId?: string;
}

export type AnnouncementListResult = PageResult<AnnouncementEntity>;
