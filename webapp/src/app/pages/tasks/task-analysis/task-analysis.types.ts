import type { TaskAnalyzeResultDto } from '@yinuo-ngm/protocol';

export interface TreemapCell {
  name: string;
  relativePath: string;
  size: number;
  ratio: number;
  type: string;
  colSpan: number;
  rowSpan: number;
  color: string;
}

export type InsightCategory = 'risk' | 'budget' | 'optimization' | 'migration' | 'diagnostic';
export type AnalysisInsight = NonNullable<TaskAnalyzeResultDto['stats']>['insights'][number];

export interface InsightGroup {
  category: InsightCategory;
  label: string;
  items: AnalysisInsight[];
}
