export const ISSUE_STATUS = ['open', 'in_progress', 'resolved', 'verified', 'reopened', 'closed'];

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '待验证',
  verified: '已验证',
  reopened: '已重开',
  closed: '已关闭',
};

export const ISSUE_STATUS_FILTER_OPTIONS = [
  { label: '所有状态', value: '' },
  { label: '待处理', value: 'open' },
  { label: '处理中', value: 'in_progress' },
  { label: '待验证', value: 'resolved' },
  { label: '已验证', value: 'verified' },
  { label: '已重开', value: 'reopened' },
  { label: '已关闭', value: 'closed' },
];

export const RD_STATUS_LABELS: Record<string, string> = {
  todo: '待开始',
  doing: '开发中',
  blocked: '阻塞中',
  done: '已完成',
  accepted: '已完成',
  closed: '已关闭',
};

export const RD_STATUS_COLORS: Record<string, string> = {
  todo: 'default',
  doing: 'processing',
  blocked: 'error',
  done: 'success',
  accepted: 'success',
  closed: 'default',
};

export const RD_STATUS_FILTER_OPTIONS = [
  { label: '所有状态', value: '' },
  { label: '待开始', value: 'todo' },
  { label: '开发中', value: 'doing' },
  { label: '阻塞中', value: 'blocked' },
  { label: '已完成', value: 'done' },
  { label: '已关闭', value: 'closed' },
] as const;
