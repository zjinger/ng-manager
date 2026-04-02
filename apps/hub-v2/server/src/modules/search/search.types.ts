export type SearchEntityType = "issue" | "rd" | "document" | "release";

export interface SearchQueryInput {
  q: string;
  types?: SearchEntityType[];
  limit: number;
}

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
