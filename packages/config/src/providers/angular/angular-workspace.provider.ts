import type { ConfigProvider } from "../../types/config-provider";
import type { ConfigDetectContext, ConfigReadContext, ConfigSchemaContext, ConfigWriteContext, ConfigPreviewContext } from "../../types/config-detect";
import type { ConfigSchema } from "../../types/config-schema";
import { detectAngularWorkspace, resolveAngularWorkspaceFile } from "./angular.detector";
import { readAngularWorkspace } from "./angular.reader";
import { previewAngularWorkspace, writeAngularWorkspace } from "./angular.writer";

export class AngularWorkspaceConfigProvider implements ConfigProvider {
  readonly type = "angular-workspace";
  readonly title = "Angular";

  async detect(ctx: ConfigDetectContext) {
    return detectAngularWorkspace(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext) {
    return readAngularWorkspace(ctx);
  }

  async getSchema(ctx: ConfigSchemaContext): Promise<ConfigSchema> {
    const doc = await readAngularWorkspace(ctx);
    return doc.schema;
  }

  async preview(ctx: ConfigPreviewContext) {
    return previewAngularWorkspace({
      projectRoot: ctx.projectRoot,
      filePath: resolveAngularWorkspaceFile(ctx.filePath),
      patches: ctx.patches
    });
  }

  async write(ctx: ConfigWriteContext) {
    return writeAngularWorkspace({
      projectRoot: ctx.projectRoot,
      filePath: resolveAngularWorkspaceFile(ctx.filePath),
      patches: ctx.patches
    });
  }
}
