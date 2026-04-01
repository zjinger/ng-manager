export const ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: '缺陷',
  feature: '新功能',
  change: '需求变更',
  improvement: '改进',
  task: '任务',
  test: '测试记录',
};

export const ISSUE_TYPE_OPTIONS = [
  { label: '缺陷', value: 'bug' },
  { label: '新功能', value: 'feature' },
  { label: '需求变更', value: 'change' },
  { label: '改进', value: 'improvement' },
  { label: '任务', value: 'task' },
  { label: '测试记录', value: 'test' },
];

export const ISSUE_TITLE_BY_TYPE = [
  { type: 'bug', title: '问题描述' },
  { type: 'feature', title: '新功能描述' },
  { type: 'change', title: '需求变更描述' },
  { type: 'improvement', title: '改进描述' },
  { type: 'task', title: '任务描述' },
  { type: 'test', title: '测试记录' },
]

