export type DocStatus = "draft" | "published" | "archived";
export type DocCategory = "guide" | "faq" | "release-note" | "spec" | "policy" | "other";

export interface DocListItem {
  id: string;
  projectId?: string | null;
  slug: string;
  title: string;
  category: DocCategory;
  summary?: string | null;
  status: DocStatus;
  version?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocDetail extends DocListItem {
  contentMd: string;
}

export interface DocListResult {
  items: DocListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DocProjectOption {
  id: string;
  name: string;
  projectKey: string;
  currentUserCanManage?: boolean;
}

export function getDocStatusColor(status: DocStatus): string {
  if (status === "published") return "green";
  if (status === "archived") return "default";
  return "orange";
}

export function getDocStatusLabel(status: DocStatus): string {
  if (status === "published") return "已发布";
  if (status === "archived") return "已归档";
  return "草稿";
}

export function getDocCategoryLabel(category: DocCategory): string {
  if (category === "guide") return "指南";
  if (category === "faq") return "常见问题";
  if (category === "release-note") return "发布说明";
  if (category === "spec") return "规范";
  if (category === "policy") return "策略";
  return "其他";
}
