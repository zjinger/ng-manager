export type ReportBlockType = "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";

export type ReportChartType = "bar" | "line" | "pie" | "donut";

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

export interface AiReportPreviewResult {
  sql: string;
  params: string[];
  title: string;
  description: string;
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
  block: ReportBlock;
}
