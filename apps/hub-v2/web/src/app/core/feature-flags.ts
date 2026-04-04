import { APP_CONFIG } from "@environments/environment";
export const FEATURE_FLAGS = {
  survey: APP_CONFIG.surveyEnabled, // 是否启用调查问卷功能
} as const;
