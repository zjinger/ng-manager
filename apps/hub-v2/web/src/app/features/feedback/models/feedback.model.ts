export type FeedbackStatus = 'open' | 'processing' | 'resolved' | 'closed';
export type FeedbackCategory = 'bug' | 'suggestion' | 'feature' | 'other';
export type FeedbackSource = 'desktop' | 'cli' | 'web' | 'mobile' | 'applet';

export interface FeedbackEntity {
  id: string;
  projectKey: string | null;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact: string | null;
  clientName: string | null;
  clientVersion: string | null;
  clientIp: string | null;
  osInfo: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: FeedbackStatus[];
  category?: FeedbackCategory[];
  source?: FeedbackSource[];
  projectId?: string;
  projectKey?: string;
}

export interface FeedbackListResult {
  items: FeedbackEntity[];
  page: number;
  pageSize: number;
  total: number;
}
