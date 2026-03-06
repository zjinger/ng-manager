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
  slug: string;
  title: string;
  category: DocumentCategory;
  summary?: string;
  contentMd: string;
  version?: string;
  createdBy?: string;
}

export interface UpdateDocumentInput {
  slug?: string;
  title?: string;
  category?: DocumentCategory;
  summary?: string;
  contentMd?: string;
  version?: string | null;
}

export interface ListDocumentQuery {
  status?: DocumentStatus;
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