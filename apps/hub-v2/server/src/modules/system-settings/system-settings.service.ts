import type { RequestContext } from "../../shared/context/request-context";
import type { SystemSettingsCommandContract, SystemSettingsQueryContract } from "./system-settings.contract";
import type {
  GeneralSettings,
  SecuritySettings,
  NotificationSettings,
  IntegrationSettings,
  SettingsCategory
} from "./system-settings.types";
import {
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_INTEGRATION_SETTINGS
} from "./system-settings.types";
import { SystemSettingsRepo } from "./system-settings.repo";

export class SystemSettingsService implements SystemSettingsCommandContract, SystemSettingsQueryContract {
  constructor(private readonly repo: SystemSettingsRepo) {}

  private getSettings<T>(category: SettingsCategory, defaults: T): T {
    const entity = this.repo.findByCategory(category);
    if (!entity) {
      return defaults;
    }
    try {
      return JSON.parse(entity.settingsData) as T;
    } catch {
      return defaults;
    }
  }

  async getGeneralSettings(ctx: RequestContext): Promise<GeneralSettings> {
    return this.getSettings<GeneralSettings>('general', DEFAULT_GENERAL_SETTINGS);
  }

  async getSecuritySettings(ctx: RequestContext): Promise<SecuritySettings> {
    return this.getSettings<SecuritySettings>('security', DEFAULT_SECURITY_SETTINGS);
  }

  async getNotificationSettings(ctx: RequestContext): Promise<NotificationSettings> {
    return this.getSettings<NotificationSettings>('notification', DEFAULT_NOTIFICATION_SETTINGS);
  }

  async getIntegrationSettings(ctx: RequestContext): Promise<IntegrationSettings> {
    return this.getSettings<IntegrationSettings>('integration', DEFAULT_INTEGRATION_SETTINGS);
  }

  async getAllSettings(ctx: RequestContext) {
    return {
      general: await this.getGeneralSettings(ctx),
      security: await this.getSecuritySettings(ctx),
      notification: await this.getNotificationSettings(ctx),
      integration: await this.getIntegrationSettings(ctx)
    };
  }

  async updateGeneralSettings(data: GeneralSettings, ctx: RequestContext): Promise<void> {
    this.repo.upsert('general', JSON.stringify(data));
  }

  async updateSecuritySettings(data: SecuritySettings, ctx: RequestContext): Promise<void> {
    this.repo.upsert('security', JSON.stringify(data));
  }

  async updateNotificationSettings(data: NotificationSettings, ctx: RequestContext): Promise<void> {
    this.repo.upsert('notification', JSON.stringify(data));
  }

  async updateIntegrationSettings(data: IntegrationSettings, ctx: RequestContext): Promise<void> {
    this.repo.upsert('integration', JSON.stringify(data));
  }
}
