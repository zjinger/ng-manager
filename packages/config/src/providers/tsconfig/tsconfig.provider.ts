import type { ConfigProvider } from "../../types/config-provider";
import type {
  ConfigDetectContext,
  ConfigPreviewContext,
  ConfigReadContext,
  ConfigSchemaContext,
  ConfigWriteContext
} from "../../types/config-detect";
import type { ConfigSchema } from "../../types/config-schema";
import { detectTsConfig, resolveTsConfigFilePath } from "./tsconfig.detector";
import { readTsConfig } from "./tsconfig.reader";
import { buildTsConfigSchema } from "./tsconfig.schema";
import { previewTsConfig, writeTsConfig } from "./tsconfig.writer";

export class TsConfigProvider implements ConfigProvider {
  readonly type = "tsconfig";
  readonly title = "TypeScript";

  async detect(ctx: ConfigDetectContext) {
    return detectTsConfig(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext) {
    return readTsConfig(ctx);
  }

  async getSchema(_ctx: ConfigSchemaContext): Promise<ConfigSchema> {
    return buildTsConfigSchema();
  }

  async preview(ctx: ConfigPreviewContext) {
    const filePath = await resolveTsConfigFilePath(ctx.projectRoot, ctx.filePath);
    return previewTsConfig({
      projectRoot: ctx.projectRoot,
      filePath,
      patches: ctx.patches
    });
  }

  async write(ctx: ConfigWriteContext) {
    const filePath = await resolveTsConfigFilePath(ctx.projectRoot, ctx.filePath);
    return writeTsConfig({
      projectRoot: ctx.projectRoot,
      filePath,
      patches: ctx.patches
    });
  }
}
