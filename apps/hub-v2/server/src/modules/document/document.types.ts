import type { PageResult } from "../../shared/http/pagination";

export type DocumentStatus = "draft" | "published" | "archived";

export interface DocumentEntity {
  id: string;
  projectId: string | null;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  contentMd: string;
  status: DocumentStatus;
  version: string | null;
  createdBy: string | null;
  publishAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateDocumentInput {
  projectId?: string | null;
  slug?: string;
  title?: string;
  category?: string;
  summary?: string;
  contentMd?: string;
  version?: string | null;
}

export interface ListDocumentsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: DocumentStatus;
  projectId?: string;
  category?: string;
}

export type DocumentListResult = PageResult<DocumentEntity>;
