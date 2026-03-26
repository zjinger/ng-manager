import type { AuthUser } from '@core/auth';

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface ProfileViewModel {
  user: AuthUser | null;
  initials: string;
}

export interface ProfileNotificationPrefs {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
  updatedAt: string;
}

export interface ProfileActivityRecord {
  id: string;
  kind: 'issue_activity' | 'rd_activity';
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
  projectName: string;
}
