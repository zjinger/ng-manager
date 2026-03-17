export type AnnouncementScope = "all" | "desktop" | "cli";
export type AnnouncementStatus = "draft" | "published" | "archived";

export interface AnnouncementReadState {
  isRead: boolean;
  readAt?: string | null;
  readVersion?: string | null;
}

export interface AnnouncementEntity extends AnnouncementReadState {
  id: string;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  contentMd: string;
  scope: AnnouncementScope;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt?: string | null;
  expireAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListItem extends AnnouncementReadState {
  id: string;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  scope: AnnouncementScope;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt?: string | null;
  expireAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementSnapshot {
  id: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  projectId?: string | null;
  title: string;
  summary?: string;
  contentMd: string;
  scope: AnnouncementScope;
  pinned?: boolean;
  publishAt?: string;
  expireAt?: string;
  createdBy?: string;
}

export interface UpdateAnnouncementInput {
  projectId?: string | null;
  title?: string;
  summary?: string;
  contentMd?: string;
  scope?: AnnouncementScope;
  pinned?: boolean;
  publishAt?: string | null;
  expireAt?: string | null;
}

export interface PublishAnnouncementInput {
  publishAt?: string;
}

export interface ListAnnouncementQuery {
  projectId?: string | null;
  status?: AnnouncementStatus;
  scope?: AnnouncementScope;
  pinned?: boolean;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface PublicListAnnouncementQuery {
  projectId?: string | null;
  includeGlobal?: boolean;
  scope?: AnnouncementScope;
  limit?: number;
}

export interface AnnouncementListResult {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  total: number;
}
