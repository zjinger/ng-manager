export const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

export const ISSUE_PRIORITY_OPTIONS = [
  { label: '全部优先级', value: '' },
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '紧急', value: 'critical' },
];

export const ISSUE_PRIORITY_COLORS: Record<string, string> = {
  low: '#52c41a',
  medium: '#faad14',
  high: '#f5222d',
  critical: '#722ed1',
};

export const ISSUE_PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'purple',
};
