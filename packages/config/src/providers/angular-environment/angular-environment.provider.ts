import type { ConfigProvider } from "../../types/config-provider";
import type {
  ConfigDetectContext,
  ConfigPreviewContext,
  ConfigReadContext,
  ConfigWriteContext
} from "../../types/config-detect";
import type { ConfigDocument } from "../../types/config-document";
import type { ConfigSchema } from "../../types/config-schema";
import type { ConfigPreviewResult, ConfigWriteResult } from "../../types/config-patch";
import { detectAngularEnvironmentFiles, resolveAngularEnvironmentFilePath } from "./angular-environment.detector";
import { readAngularEnvironmentFile, type AngularEnvironmentViewModel } from "./angular-environment.reader";
import { buildAngularEnvironmentSchema } from "./angular-environment.schema";
import { previewAngularEnvironmentFile, writeAngularEnvironmentFile } from "./angular-environment.writer";

export class AngularEnvironmentConfigProvider implements ConfigProvider {
  readonly type = "angular-environment";
  readonly title = "Angular 环境";
  readonly description = "管理 src/environments/environment*.ts";

  async detect(ctx: ConfigDetectContext) {
    return detectAngularEnvironmentFiles(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext): Promise<ConfigDocument<AngularEnvironmentViewModel, { raw: string }>> {
    return readAngularEnvironmentFile({
      projectRoot: ctx.projectRoot,
      filePath: ctx.filePath
    });
  }

  async getSchema(_ctx: ConfigReadContext): Promise<ConfigSchema> {
    return buildAngularEnvironmentSchema();
  }

  async preview(ctx: ConfigPreviewContext): Promise<ConfigPreviewResult> {
    const filePath = await resolveAngularEnvironmentFilePath(ctx.projectRoot, ctx.filePath);
    return previewAngularEnvironmentFile({
      projectRoot: ctx.projectRoot,
      filePath,
      patches: ctx.patches
    });
  }

  async write(ctx: ConfigWriteContext): Promise<ConfigWriteResult> {
    const filePath = await resolveAngularEnvironmentFilePath(ctx.projectRoot, ctx.filePath);
    return writeAngularEnvironmentFile({
      projectRoot: ctx.projectRoot,
      filePath,
      patches: ctx.patches
    });
  }
}

