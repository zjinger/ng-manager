export type NotificationKind = 'todo' | 'activity' | 'announcement';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  sourceLabel: string;
  projectName: string;
  time: string;
  route: string;
  unread: boolean;
  projectId: string | null;
}
