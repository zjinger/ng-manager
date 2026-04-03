export type ReportBlockType = "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";

export type ReportChartType = "bar" | "line" | "pie" | "donut" | "radar";

export interface ReportChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ReportBlock {
  type: ReportBlockType;
  title: string;
  description?: string;
  value?: number | string;
  subText?: string;
  subValue?: string;
  trend?: "up" | "down" | "flat";
  chart?: {
    type: ReportChartType;
    labels: string[];
    datasets: ReportChartDataset[];
  };
  columns?: Array<{ key: string; label: string }>;
  rows?: Array<Record<string, unknown>>;
  items?: Array<{ rank: number; label: string; value: number; percent?: number }>;
}

export interface ReportCaliber {
  summary: string;
  scope: string;
  timeRange: string;
  metric: string;
  dataSource: string;
}

export interface AiReportPreviewResult {
  sql: string;
  params: string[];
  title: string;
  description: string;
  caliber?: ReportCaliber;
  blocks?: ReportBlock[];
  block: ReportBlock;
}

export interface ReportTemplate {
  id: string;
  title: string;
  naturalQuery: string;
  sql: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplateListResult {
  items: ReportTemplate[];
}

export interface ReportTemplateExecuteResult {
  template: ReportTemplate;
  sql: string;
  params: string[];
  caliber?: ReportCaliber;
  blocks?: ReportBlock[];
  block: ReportBlock;
}

export interface ReportTemplateCreateResult {
  template: ReportTemplate;
  duplicated: boolean;
}

export interface ReportPublicProject {
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

export interface ReportPublicCapability {
  enabled: boolean;
}

export interface ReportPublicProjectListResult {
  items: ReportPublicProject[];
}

export interface ReportBoardItem {
  id: string;
  title: string;
  naturalQuery: string;
  sql: string;
  params: string[];
  blocks: ReportBlock[];
  layoutSize?: 'compact' | 'wide';
}

export interface ReportPublicBoardItem {
  id: string;
  boardId: string;
  sortOrder: number;
  title: string;
  naturalQuery: string;
  sql: string;
  params: string[];
  blocks: ReportBlock[];
  layoutSize: 'compact' | 'wide';
  createdAt: string;
  updatedAt: string;
}

export interface ReportPublicBoard {
  id: string;
  title: string;
  shareToken: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: ReportPublicBoardItem[];
}

export interface ReportPublicBoardSummary {
  id: string;
  title: string;
  shareToken: string;
  isActive: boolean;
  createdBy: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}
