import { ConfigProviderRegistry } from "../registry/config-provider.registry";
import type { ConfigDocument } from "../types/config-document";
import type { ConfigDetectResult } from "../types/config-detect";
import type { ConfigPreviewResult, ConfigWriteResult } from "../types/config-patch";
import type { ConfigSchema } from "../types/config-schema";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export class ConfigService {
  constructor(private readonly registry: ConfigProviderRegistry) {}

  listProviders(): Array<{ type: string; title: string; description?: string }> {
    return this.registry.list().map((provider) => ({
      type: provider.type,
      title: provider.title,
      description: provider.description
    }));
  }

  async detect(projectRoot: string): Promise<ConfigDetectResult[]> {
    const providers = this.registry.list();
    return Promise.all(providers.map((provider) => provider.detect({ projectRoot })));
  }

  async read(input: {
    projectRoot: string;
    type: string;
    filePath?: string;
  }): Promise<ConfigDocument> {
    const provider = this.registry.require(input.type);
    return provider.read({
      projectRoot: input.projectRoot,
      filePath: input.filePath
    });
  }

  async getSchema(input: {
    projectRoot: string;
    type: string;
    filePath?: string;
  }): Promise<ConfigSchema> {
    const provider = this.registry.require(input.type);
    return provider.getSchema({
      projectRoot: input.projectRoot,
      filePath: input.filePath
    });
  }

  async preview(input: {
    projectRoot: string;
    type: string;
    filePath: string;
    patches: Array<{ op: "set" | "remove" | "append" | "merge"; path: string; value?: unknown }>;
  }): Promise<ConfigPreviewResult> {
    const provider = this.registry.require(input.type);
    if (!provider.preview) {
      throw new CoreError(
        CoreErrorCodes.CONFIG_UNSUPPORTED_PREVIEW,
        `Provider does not support preview: ${input.type}`,
        { type: input.type }
      );
    }
    return provider.preview(input);
  }

  async write(input: {
    projectRoot: string;
    type: string;
    filePath: string;
    patches: Array<{ op: "set" | "remove" | "append" | "merge"; path: string; value?: unknown }>;
  }): Promise<ConfigWriteResult> {
    const provider = this.registry.require(input.type);
    return provider.write(input);
  }
}
