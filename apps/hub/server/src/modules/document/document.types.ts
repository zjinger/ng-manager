export type DocumentCategory =
  | "guide"
  | "faq"
  | "release-note"
  | "spec"
  | "policy"
  | "other";

export type DocumentStatus = "draft" | "published" | "archived";

export interface DocumentEntity {
  id: string;
  projectId?: string | null;
  slug: string;
  title: string;
  category: DocumentCategory;
  summary?: string | null;
  contentMd: string;
  status: DocumentStatus;
  version?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListItem {
  id: string;
  projectId?: string | null;
  slug: string;
  title: string;
  category: DocumentCategory;
  summary?: string | null;
  status: DocumentStatus;
  version?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  projectId?: string | null;
  slug: string;
  title: string;
  category: DocumentCategory;
  summary?: string;
  contentMd: string;
  version?: string;
  createdBy?: string;
}

export interface UpdateDocumentInput {
  projectId?: string | null;
  slug?: string;
  title?: string;
  category?: DocumentCategory;
  summary?: string;
  contentMd?: string;
  version?: string | null;
}

export interface ListDocumentQuery {
  projectId?: string | null;
  status?: DocumentStatus;
  category?: DocumentCategory;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface PublicListDocumentQuery {
  projectId?: string | null;
  includeGlobal?: boolean;
  category?: DocumentCategory;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface DocumentListResult {
  items: DocumentListItem[];
  page: number;
  pageSize: number;
  total: number;
}