export interface HubMigrationConfig {
  enabled: boolean;
  forceRedirect: boolean;
  autoRedirectDelay: number;
  v2BaseUrl: string;
  v2Label: string;
  showBanner: boolean;
  showModalOnEntry: boolean;
  notice: string;
}

export const HUB_MIGRATION_CONFIG: HubMigrationConfig = {
  enabled: true,
  forceRedirect: true,
  autoRedirectDelay:20000,
  v2BaseUrl: 'http://192.168.1.31:7008',
  v2Label: 'hub-v2',
  showBanner: true,
  showModalOnEntry:true,
  notice: 'hub-v2 已正式替代 hub-v1，旧版不再作为正式业务入口。请立即进入新系统继续使用。'
};