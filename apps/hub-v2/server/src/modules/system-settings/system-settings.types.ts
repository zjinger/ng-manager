export const SETTINGS_CATEGORIES = ['general', 'security', 'notification', 'integration'] as const;
export type SettingsCategory = typeof SETTINGS_CATEGORIES[number];

export interface GeneralSettings {
  platformName: string;
  platformDesc: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  openRegistration: boolean;
  emailWhitelist: string;
  defaultRole: string;
  requireApproval: boolean;
}

export interface SecuritySettings {
  minPasswordLength: number;
  requireComplexity: boolean;
  passwordExpiry: number;
  loginFailureLock: number;
  globalForce2FA: boolean;
  adminForce2FA: boolean;
  sessionTimeout: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  wechatWorkEnabled: boolean;
  feishuEnabled: boolean;
  dingtalkEnabled: boolean;
  browserPushEnabled: boolean;
}

export interface IntegrationItem {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  icon: string;
}

export interface ApiKeyItem {
  name: string;
  key: string;
  scope: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}

export interface IntegrationSettings {
  integrations: IntegrationItem[];
  apiKeys: ApiKeyItem[];
}

export interface SystemSettingEntity {
  id: string;
  category: SettingsCategory;
  settingsData: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  platformName: 'Hub v2 — 内网协作平台',
  platformDesc: '企业级内网协作与项目管理平台',
  defaultLanguage: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  openRegistration: false,
  emailWhitelist: '@hub.com, @xiaomi.com',
  defaultRole: 'developer',
  requireApproval: true
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  minPasswordLength: 10,
  requireComplexity: true,
  passwordExpiry: 90,
  loginFailureLock: 5,
  globalForce2FA: false,
  adminForce2FA: true,
  sessionTimeout: 30
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  wechatWorkEnabled: true,
  feishuEnabled: false,
  dingtalkEnabled: false,
  browserPushEnabled: true
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  integrations: [
    { name: 'GitLab 集成', description: '关联 GitLab 仓库，自动同步代码提交和 MR', status: 'active', icon: 'gitlab' },
    { name: 'Jenkins CI/CD', description: '关联 Jenkins 构建流水线', status: 'active', icon: 'build' },
    { name: 'HR 系统同步', description: '自动同步组织架构和人员信息', status: 'active', icon: 'sync' },
    { name: 'Jira 同步', description: '双向同步 Jira Issue', status: 'inactive', icon: 'issues-close' }
  ],
  apiKeys: []
};
