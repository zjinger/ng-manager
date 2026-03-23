import type { PageResult } from "../../shared/http/pagination";

export interface FeedbackEntity {
  id: string;
  source: string;
  category: string;
  title: string;
  content: string;
  contact: string | null;
  clientName: string | null;
  clientVersion: string | null;
  clientIp: string | null;
  osInfo: string | null;
  projectKey: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListFeedbacksQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  category?: string;
  source?: string;
}

export type FeedbackListResult = PageResult<FeedbackEntity>;
