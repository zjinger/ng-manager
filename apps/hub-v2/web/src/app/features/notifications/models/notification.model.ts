export type NotificationKind = 'todo' | 'activity';

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

export interface NotificationApiItem {
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
