export type NotificationKind = "todo" | "activity" | "announcement";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
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
  limit?: number;
}

export interface NotificationListResult {
  items: NotificationItem[];
}
