export const SKILL_CATEGORY_OPTIONS = [
  { label: '通用', value: 'general' },
  { label: '文档', value: 'docs' },
  { label: 'API', value: 'api' },
  { label: 'CLI', value: 'cli' },
  { label: '自动化', value: 'automation' },
  { label: '数据处理', value: 'data' },
  { label: '图片/多媒体', value: 'media' },
  { label: '前端', value: 'frontend' },
  { label: '后端', value: 'backend' },
  { label: '测试', value: 'testing' },
] as const;

export type SkillCategoryValue = (typeof SKILL_CATEGORY_OPTIONS)[number]['value'];
