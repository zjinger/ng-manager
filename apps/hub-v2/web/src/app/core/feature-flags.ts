import { APP_CONFIG } from '@environments/environment';

export const FEATURE_FLAGS = {
  survey: APP_CONFIG.surveyEnabled, // 是否启用调查问卷功能
  feedback: APP_CONFIG.feedbackEnabled, // 是否启用反馈功能
  finance: APP_CONFIG.financeEnabled, // 是否启用财务中心
} as const;
