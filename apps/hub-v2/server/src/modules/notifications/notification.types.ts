export type NotificationKind = "todo" | "activity";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  unread: boolean;
  sourceLabel: string;
  title: string;
  description: string;
  time: string;
  projectId: string | null;
  projectName: string;
  route: string;
}

export interface ListNotificationsQuery {
  kind?: NotificationKind;
  keyword?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface NotificationListResult {
  total: number;
  unreadTotal: number;
  page: number;
  pageSize: number;
  items: NotificationItem[];
}

export interface MarkNotificationReadsInput {
  notificationIds?: string[];
}

export interface MarkNotificationReadsResult {
  updated: number;
  unreadCount: number;
}

export interface IngestedNotification {
  userId: string;
  unreadCount: number;
  item: NotificationItem;
}

export interface NotificationIngestResult {
  delivered: IngestedNotification[];
}
