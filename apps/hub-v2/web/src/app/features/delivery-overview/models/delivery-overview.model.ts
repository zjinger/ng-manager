import type { RdItemEntity } from '../../rd/models/rd.model';

export type OverviewTone = 'blue' | 'green' | 'orange' | 'red' | 'gray';

export interface MetricItem {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  tone: OverviewTone;
}

export interface StageOverview {
  id: string;
  name: string;
  count: number;
  averageProgress: number;
  blockedCount: number;
}

export interface KeyRdItem {
  item: RdItemEntity;
  stageName: string;
  healthLabel: string;
  healthTone: OverviewTone;
  reportNote: string;
  late: boolean;
}

export interface AttentionItem {
  title: string;
  tone: OverviewTone;
  status: string;
  description: string;
  owner: string;
  target: string;
  routerLink?: string[];
}

export interface SummaryBlock {
  title: string;
  icon: string;
  tone: OverviewTone;
  content: string;
  meta: string;
}

export interface DeliveryOverviewVm {
  progress: number;
  metrics: MetricItem[];
  stages: StageOverview[];
  keyItems: KeyRdItem[];
  attentions: AttentionItem[];
  summaries: SummaryBlock[];
  completedCount: number;
  inProgressCount: number;
  attentionCount: number;
  unfinishedIssueCount: number;
  truncated: boolean;
  totalRdCount: number;
  sampledRdCount: number;
}
