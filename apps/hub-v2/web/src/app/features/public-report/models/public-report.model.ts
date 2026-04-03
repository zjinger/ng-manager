import type { AiReportPreviewResult, ReportBlock, ReportPublicBoard } from '../../report/models/report.model';

export interface PublicReportProjectItem {
  id: string;
  name: string;
  key: string;
  description?: string | null;
}

export interface PublicReportProjectsResult {
  items: PublicReportProjectItem[];
}

export interface PublicReportPreviewInput {
  query: string;
  projectId?: string;
  share?: string;
}

export type PublicReportPreviewResult = AiReportPreviewResult & {
  blocks?: ReportBlock[];
};

export type PublicReportBoardResult = ReportPublicBoard;
