export type MobileMessageType = 'announcement' | 'document' | 'release' | 'notification';
export type MobileMessageCategory = 'all' | 'issue' | 'rd' | 'announcement' | 'document' | 'release';

export interface MobileMessageItem {
  id: string;
  messageType: MobileMessageType;
  category: MobileMessageCategory;
  title: string;
  description: string | null;
  unread: boolean;
  time: string;
  projectId: string | null;
  mobileRoute: string;
}

export interface MobileMessagePage {
  items: MobileMessageItem[];
  page: number;
  pageSize: number;
  total: number;
  unreadTotal: number;
}

export interface MobileMessageDetail {
  id: string;
  messageType: MobileMessageType;
  title: string;
  markdown: string;
  projectId: string | null;
  publishedAt: string | null;
  unread: boolean;
}

export interface FetchMessagesParams {
  category?: MobileMessageCategory;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MarkMessagesReadInput {
  all?: boolean;
  notificationIds?: string[];
}

export interface MarkMessagesReadResult {
  updated: number;
  unreadCount: number;
}

export const messageCategoryLabels: Record<MobileMessageCategory, string> = {
  all: '全部',
  issue: 'Issue',
  rd: '研发',
  announcement: '公告',
  document: '文档',
  release: '发布',
};

export const messageTypeLabels: Record<MobileMessageType, string> = {
  announcement: '公告',
  document: '文档',
  release: '发布',
  notification: '通知',
};
