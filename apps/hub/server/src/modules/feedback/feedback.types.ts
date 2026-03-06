export type FeedbackSource = "desktop" | "cli" | "web";
export type FeedbackCategory = "bug" | "suggestion" | "feature" | "other";
export type FeedbackStatus = "open" | "processing" | "resolved" | "closed";

export interface FeedbackEntity {
  id: string;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string | null;
  clientName?: string | null;
  clientVersion?: string | null;
  osInfo?: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
  clientName?: string;
  clientVersion?: string;
  osInfo?: string;
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus;
}

export interface ListFeedbackQuery {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface FeedbackListResult {
  items: FeedbackEntity[];
  page: number;
  pageSize: number;
  total: number;
}