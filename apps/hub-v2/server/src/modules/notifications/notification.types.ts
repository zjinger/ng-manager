export type NotificationKind = "todo" | "activity";
export type NotificationCategory =
  | "issue_todo"
  | "issue_mention"
  | "issue_activity"
  | "rd_todo"
  | "rd_activity"
  | "announcement"
  | "document"
  | "release"
  | "project_member";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
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
  category?: NotificationCategory;
  keyword?: string;
  projectId?: string;
  unreadOnly?: boolean | "true" | "false";
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
  all?: boolean;
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
