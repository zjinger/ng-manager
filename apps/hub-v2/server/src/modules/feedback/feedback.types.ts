import type { PageResult } from "../../shared/http/pagination";

export type FeedbackSource = "desktop" | "cli" | "web" | "mobile" | "applet";
export type FeedbackCategory = "bug" | "suggestion" | "feature" | "other";
export type FeedbackStatus = "open" | "processing" | "resolved" | "closed";

export interface FeedbackEntity {
  id: string;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact: string | null;
  clientName: string | null;
  clientVersion: string | null;
  clientIp: string | null;
  osInfo: string | null;
  projectKey: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  projectKey?: string | null;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
  clientName?: string;
  clientVersion?: string;
  osInfo?: string;
  clientIp?: string;
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus;
}

export interface ListFeedbacksQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  source?: FeedbackSource;
  projectId?: string;
  projectKey?: string;
  projectKeys?: string[];
}

export type FeedbackListResult = PageResult<FeedbackEntity>;
