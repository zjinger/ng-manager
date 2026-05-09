import type { ConfigProvider } from "../../types/config-provider";
import type {
  ConfigDetectContext,
  ConfigPreviewContext,
  ConfigReadContext,
  ConfigWriteContext
} from "../../types/config-detect";
import type { ConfigSchema } from "../../types/config-schema";
import { detectPackageJson, resolvePackageJsonFile } from "./package-json.detector";
import { readPackageJson } from "./package-json.reader";
import { buildPackageJsonSchema } from "./package-json.schema";
import { previewPackageJson, writePackageJson } from "./package-json.writer";

export class PackageJsonConfigProvider implements ConfigProvider {
  readonly type = "package-json";
  readonly title = "Package";

  async detect(ctx: ConfigDetectContext) {
    return detectPackageJson(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext) {
    return readPackageJson(ctx);
  }

  async getSchema(_ctx: ConfigReadContext): Promise<ConfigSchema> {
    return buildPackageJsonSchema();
  }

  async preview(ctx: ConfigPreviewContext) {
    return previewPackageJson({
      projectRoot: ctx.projectRoot,
      filePath: resolvePackageJsonFile(ctx.filePath),
      patches: ctx.patches
    });
  }

  async write(ctx: ConfigWriteContext) {
    return writePackageJson({
      projectRoot: ctx.projectRoot,
      filePath: resolvePackageJsonFile(ctx.filePath),
      patches: ctx.patches
    });
  }
}
