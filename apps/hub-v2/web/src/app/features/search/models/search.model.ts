export type WorkspaceSearchEntityType = 'issue' | 'rd' | 'document' | 'release';
export type AdminSearchEntityType = 'user' | 'department' | 'role' | 'permission' | 'audit_log' | 'setting';
export type SearchEntityType = WorkspaceSearchEntityType | AdminSearchEntityType;
export type SearchMode = 'workspace' | 'admin';

export interface SearchItem {
  type: SearchEntityType;
  id: string;
  projectId: string | null;
  title: string;
  snippet: string;
  updatedAt: string;
  score: number;
  url: string;
}

export interface SearchResult {
  items: SearchItem[];
  total: number;
}
