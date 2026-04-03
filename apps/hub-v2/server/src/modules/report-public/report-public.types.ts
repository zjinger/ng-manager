import type { RenderedBlock } from "../ai/ai-report-render.service";

export interface ReportPublicProjectEntity {
  id: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  projectDescription: string | null;
  shareToken: string;
  allowAllProjects: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPublicTemplateEntity {
  id: string;
  projectId: string;
  shareToken: string;
  title: string;
  naturalQuery: string;
  createdAt: string;
}

export interface ReportPublicProjectCreateInput {
  projectId: string;
  allowAllProjects?: boolean;
}

export type ReportPublicBoardLayoutSize = "compact" | "wide";

export interface ReportPublicBoardItemSnapshotEntity {
  id: string;
  boardId: string;
  sortOrder: number;
  title: string;
  naturalQuery: string;
  sql: string;
  params: string[];
  blocks: RenderedBlock[];
  layoutSize: ReportPublicBoardLayoutSize;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPublicBoardEntity {
  id: string;
  title: string;
  shareToken: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: ReportPublicBoardItemSnapshotEntity[];
}

export interface ReportPublicBoardSummaryEntity {
  id: string;
  title: string;
  shareToken: string;
  isActive: boolean;
  createdBy: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPublicBoardPublishItemInput {
  title: string;
  naturalQuery: string;
  sql: string;
  params: string[];
  blocks: RenderedBlock[];
  layoutSize: ReportPublicBoardLayoutSize;
}
