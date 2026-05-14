import type { RequestContext } from "../../shared/context/request-context";
import type {
  GeneralSettings,
  SecuritySettings,
  NotificationSettings,
  IntegrationSettings
} from "./system-settings.types";

export interface SystemSettingsCommandContract {
  updateGeneralSettings(data: GeneralSettings, ctx: RequestContext): Promise<void>;
  updateSecuritySettings(data: SecuritySettings, ctx: RequestContext): Promise<void>;
  updateNotificationSettings(data: NotificationSettings, ctx: RequestContext): Promise<void>;
  updateIntegrationSettings(data: IntegrationSettings, ctx: RequestContext): Promise<void>;
}

export interface SystemSettingsQueryContract {
  getGeneralSettings(ctx: RequestContext): Promise<GeneralSettings>;
  getSecuritySettings(ctx: RequestContext): Promise<SecuritySettings>;
  getNotificationSettings(ctx: RequestContext): Promise<NotificationSettings>;
  getIntegrationSettings(ctx: RequestContext): Promise<IntegrationSettings>;
  getAllSettings(ctx: RequestContext): Promise<{
    general: GeneralSettings;
    security: SecuritySettings;
    notification: NotificationSettings;
    integration: IntegrationSettings;
  }>;
}
