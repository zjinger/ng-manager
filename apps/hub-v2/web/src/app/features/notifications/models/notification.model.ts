export type NotificationKind = 'todo' | 'activity';
export type NotificationCategory =
  | 'issue_todo'
  | 'issue_mention'
  | 'issue_activity'
  | 'rd_todo'
  | 'rd_activity'
  | 'announcement'
  | 'document'
  | 'release'
  | 'project_member';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
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
  category: NotificationCategory;
  title: string;
  description: string;
  sourceLabel: string;
  projectName: string;
  time: string;
  route: string;
  unread: boolean;
  projectId: string | null;
}
