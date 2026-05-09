import type { ConfigProvider } from "../../types/config-provider";
import type { ConfigDetectContext, ConfigReadContext } from "../../types/config-detect";
import type { ConfigDocument } from "../../types/config-document";
import type { ConfigSchema } from "../../types/config-schema";
import { detectViteConfig, resolveViteFilePath } from "./vite.detector";
import { readViteConfig } from "./vite.reader";
import { buildViteSchema } from "./vite.schema";
import type { ViteConfigViewModel } from "./vite.viewmodel";

export class ViteConfigProvider implements ConfigProvider {
  readonly type = "vite-config";
  readonly title = "Vite";
  readonly description = "Vite 配置只读视图";

  async detect(ctx: ConfigDetectContext) {
    return detectViteConfig(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext): Promise<ConfigDocument<ViteConfigViewModel, string>> {
    const filePath = await resolveViteFilePath(ctx.projectRoot, ctx.filePath);
    const result = await readViteConfig({
      projectRoot: ctx.projectRoot,
      filePath
    });

    return {
      id: `vite-config:${filePath}`,
      type: this.type,
      title: this.title,
      projectRoot: ctx.projectRoot,
      filePath,
      raw: result.content,
      viewModel: result.viewModel,
      schema: buildViteSchema(),
      readonly: true
    };
  }

  async getSchema(_ctx: ConfigReadContext): Promise<ConfigSchema> {
    return buildViteSchema();
  }
}