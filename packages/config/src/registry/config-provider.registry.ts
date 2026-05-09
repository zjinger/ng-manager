import type { ConfigProvider } from "../types/config-provider";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export class ConfigProviderRegistry {
  private readonly providers = new Map<string, ConfigProvider>();

  register(provider: ConfigProvider): void {
    if (this.providers.has(provider.type)) {
      throw new CoreError(
        `Config provider already registered: ${provider.type}`,
        CoreErrorCodes.CONFIG_PATCH_INVALID,
        { type: provider.type }
      );
    }

    this.providers.set(provider.type, provider);
  }

  get(type: string): ConfigProvider | undefined {
    return this.providers.get(type);
  }

  list(): ConfigProvider[] {
    return Array.from(this.providers.values());
  }

  require(type: string): ConfigProvider {
    const provider = this.get(type);
    if (!provider) {
      throw new CoreError(
        `Config provider not found: ${type}`,
        CoreErrorCodes.CONFIG_PROVIDER_NOT_FOUND,
        { type }
      );
    }
    return provider;
  }
}

import { AngularWorkspaceConfigProvider } from "../providers/angular/angular-workspace.provider";
import { EnvConfigProvider } from "../providers/env/env.provider";
import { PackageJsonConfigProvider } from "../providers/package-json/package-json.provider";
import { TsConfigProvider } from "../providers/tsconfig/tsconfig.provider";
import { ViteConfigProvider } from "../providers/vite/vite.provider";
import { VueConfigProvider } from "../providers/vue/vue.provider";

export function createDefaultConfigRegistry(): ConfigProviderRegistry {
  const registry = new ConfigProviderRegistry();

  registry.register(new AngularWorkspaceConfigProvider());
  registry.register(new TsConfigProvider());
  registry.register(new PackageJsonConfigProvider());
  registry.register(new VueConfigProvider());
  registry.register(new ViteConfigProvider());
  registry.register(new EnvConfigProvider());

  return registry;
}
