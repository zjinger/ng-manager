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
  page: number;
  pageSize: number;
  items: NotificationItem[];
}

export interface MarkNotificationReadsInput {
  announcementIds?: string[];
}

export interface MarkNotificationReadsResult {
  updated: number;
}
