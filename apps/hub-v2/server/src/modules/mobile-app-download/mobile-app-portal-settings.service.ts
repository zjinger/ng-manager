import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type {
  SharedConfigCommandContract,
  SharedConfigQueryContract
} from "../shared-config/shared-config.contract";
import type { SharedConfigEntity } from "../shared-config/shared-config.types";
import { createDefaultPortalSettings, portalSettingsSchema } from "./mobile-app-version.schema";
import type { MobileAppPortalSettings } from "./mobile-app-version.types";

export const MOBILE_APP_PORTAL_SETTINGS_CATEGORY = "mobile-app-portal";
export const MOBILE_APP_PORTAL_SETTINGS_KEY = "mobile-app.portal-settings";

type MobileAppPortalSettingsServiceDeps = {
  sharedConfigQuery: SharedConfigQueryContract;
  sharedConfigCommand?: SharedConfigCommandContract;
};

export class MobileAppPortalSettingsService {
  constructor(private readonly deps: MobileAppPortalSettingsServiceDeps) {}

  async get(projectId: string, projectName: string, ctx: RequestContext): Promise<MobileAppPortalSettings> {
    const config = await this.find(projectId, ctx);
    if (!config) {
      return createDefaultPortalSettings(projectName);
    }
    return parsePortalSettings(config.configValue);
  }

  async update(
    projectId: string,
    projectName: string,
    input: unknown,
    ctx: RequestContext
  ): Promise<MobileAppPortalSettings> {
    if (!this.deps.sharedConfigCommand) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "shared config command service is unavailable", 500);
    }

    const settings = parsePortalSettings(input);
    const current = await this.find(projectId, ctx);
    const payload = {
      configName: `${projectName} 移动端 APP 门户配置`,
      category: MOBILE_APP_PORTAL_SETTINGS_CATEGORY,
      valueType: "json",
      configValue: JSON.stringify(settings),
      description: "项目级移动端 APP 门户配置",
      status: "active" as const
    };
    if (current) {
      await this.deps.sharedConfigCommand.update(current.id, payload, ctx);
    } else {
      await this.deps.sharedConfigCommand.create(
        {
          projectId,
          scope: "project",
          configKey: MOBILE_APP_PORTAL_SETTINGS_KEY,
          ...payload,
          isEncrypted: false,
          priority: 0
        },
        ctx
      );
    }
    return settings;
  }

  private async find(projectId: string, ctx: RequestContext): Promise<SharedConfigEntity | null> {
    const result = await this.deps.sharedConfigQuery.list(
      {
        projectId,
        category: MOBILE_APP_PORTAL_SETTINGS_CATEGORY,
        page: 1,
        pageSize: 20
      },
      ctx
    );
    return result.items.find((item) => item.configKey === MOBILE_APP_PORTAL_SETTINGS_KEY && item.status === "active") ?? null;
  }
}

function parsePortalSettings(input: unknown): MobileAppPortalSettings {
  try {
    const value = typeof input === "string" ? JSON.parse(input) : input;
    return portalSettingsSchema.parse(value);
  } catch {
    throw new AppError(ERROR_CODES.MOBILE_APP_PORTAL_SETTINGS_INVALID, "mobile app portal settings invalid", 400);
  }
}
