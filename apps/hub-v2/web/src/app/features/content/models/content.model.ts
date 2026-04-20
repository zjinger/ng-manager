import type { PageResult } from '@core/types';

export type ContentTab = 'announcements' | 'documents' | 'releases';
export type ContentStatus = 'draft' | 'published' | 'archived' | '';

export interface AnnouncementEntity {
  id: string;
  projectId: string | null;
  title: string;
  summary: string | null;
  contentMd: string;
  scope: 'global' | 'project';
  pinned: boolean;
  status: 'draft' | 'published' | 'archived';
  publishAt: string | null;
  expireAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentEntity {
  id: string;
  projectId: string | null;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  contentMd: string;
  status: 'draft' | 'published' | 'archived';
  version: string | null;
  createdBy: string | null;
  publishAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseEntity {
  id: string;
  projectId: string | null;
  channel: string;
  version: string;
  title: string;
  notes: string | null;
  downloadUrl: string | null;
  syncToProjectVersion: boolean;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: ContentStatus;
  projectId?: string;
}

export type AnnouncementListResult = PageResult<AnnouncementEntity>;
export type DocumentListResult = PageResult<DocumentEntity>;
export type ReleaseListResult = PageResult<ReleaseEntity>;

export interface CreateAnnouncementInput {
  projectId?: string | null;
  title: string;
  summary?: string;
  contentMd: string;
  scope?: 'global' | 'project';
  pinned?: boolean;
  expireAt?: string;
}

export interface CreateDocumentInput {
  projectId?: string | null;
  slug: string;
  title: string;
  category?: string;
  summary?: string;
  contentMd: string;
  version?: string;
}

export interface CreateReleaseInput {
  projectId?: string | null;
  channel: string;
  version: string;
  title: string;
  notes?: string;
  downloadUrl?: string;
  syncToProjectVersion?: boolean;
}

export interface UpdateAnnouncementInput {
  projectId?: string | null;
  title?: string;
  summary?: string;
  contentMd?: string;
  scope?: 'global' | 'project';
  pinned?: boolean;
  expireAt?: string | null;
}

export interface UpdateDocumentInput {
  projectId?: string | null;
  slug?: string;
  title?: string;
  category?: string;
  summary?: string;
  contentMd?: string;
  version?: string | null;
}

export interface UpdateReleaseInput {
  projectId?: string | null;
  channel?: string;
  version?: string;
  title?: string;
  notes?: string | null;
  downloadUrl?: string | null;
  syncToProjectVersion?: boolean;
}
