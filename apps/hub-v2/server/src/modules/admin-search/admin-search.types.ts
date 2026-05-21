export const ADMIN_SEARCH_ENTITY_TYPES = [
  "user",
  "department",
  "role",
  "permission",
  "audit_log",
  "setting"
] as const;

export type AdminSearchEntityType = typeof ADMIN_SEARCH_ENTITY_TYPES[number];

export interface AdminSearchQueryInput {
  q: string;
  types?: AdminSearchEntityType[];
  limit: number;
}

export interface AdminSearchItem {
  type: AdminSearchEntityType;
  id: string;
  projectId: null;
  title: string;
  snippet: string;
  updatedAt: string;
  score: number;
  url: string;
}

export interface AdminSearchResult {
  items: AdminSearchItem[];
  total: number;
}
