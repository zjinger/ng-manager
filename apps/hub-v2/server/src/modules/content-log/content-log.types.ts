export type ContentLogType = "announcement" | "document" | "release";
export type ContentLogAction = "created" | "updated" | "published" | "archived";

export interface ContentLogEntity {
  id: string;
  projectId: string | null;
  contentType: ContentLogType;
  contentId: string;
  actionType: ContentLogAction;
  title: string;
  summary: string | null;
  operatorId: string | null;
  operatorName: string | null;
  metaJson: string | null;
  createdAt: string;
}

