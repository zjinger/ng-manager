export interface ProfileNotificationPrefs {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
  updatedAt: string;
}

export interface ProfileActivityItem {
  id: string;
  kind: "issue_activity" | "rd_activity";
  entityId: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
  projectName: string;
}

export interface ListProfileActivitiesQuery {
  days?: number;
  limit?: number;
  kind?: "issue_activity" | "rd_activity";
}

export interface UpdateProfileNotificationPrefsInput {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
}
