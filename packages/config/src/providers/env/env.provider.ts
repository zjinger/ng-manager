import type { ConfigProvider } from "../../types/config-provider";
import type {
  ConfigDetectContext,
  ConfigReadContext,
  ConfigWriteContext
} from "../../types/config-detect";
import type { ConfigDocument } from "../../types/config-document";
import type { ConfigSchema } from "../../types/config-schema";
import type { ConfigWriteResult } from "../../types/config-patch";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { detectEnvFiles, resolveEnvFilePath } from "./env.detector";
import { readEnvFile } from "./env.reader";
import { buildEnvSchema } from "./env.schema";
import type { EnvViewModel } from "./env.viewmodel";
import { parseEnvContent } from "./env-format";
import { writeEnvFile } from "./env.writer";

export class EnvConfigProvider implements ConfigProvider {
  readonly type = "env";
  readonly title = "Env";

  async detect(ctx: ConfigDetectContext) {
    return detectEnvFiles(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext): Promise<ConfigDocument<EnvViewModel, string>> {
    const filePath = await resolveEnvFilePath(ctx.projectRoot, ctx.filePath);
    const result = await readEnvFile({
      projectRoot: ctx.projectRoot,
      filePath
    });

    return {
      id: `env:${filePath}`,
      type: this.type,
      title: this.title,
      projectRoot: ctx.projectRoot,
      filePath,
      raw: result.content,
      viewModel: {
        files: [{ filePath, entries: result.entries }]
      },
      schema: buildEnvSchema()
    };
  }

  async getSchema(_ctx: ConfigReadContext): Promise<ConfigSchema> {
    return buildEnvSchema();
  }

  async write(ctx: ConfigWriteContext): Promise<ConfigWriteResult> {
    const filePath = await resolveEnvFilePath(ctx.projectRoot, ctx.filePath);
    const current = await readEnvFile({
      projectRoot: ctx.projectRoot,
      filePath
    });

    // 当前阶段只支持整文件替换（通过 /raw 的 set patch）
    const rawPatch = ctx.patches.find((patch) => patch.op === "set" && patch.path === "/raw");
    if (!rawPatch || typeof rawPatch.value !== "string") {
      throw new CoreError(
        CoreErrorCodes.CONFIG_UNSUPPORTED_WRITE,
        "Env Provider 当前仅支持通过 /raw 进行 set 写入",
        { type: this.type, patches: ctx.patches }
      );
    }

    const entries = parseEnvContent(rawPatch.value);
    const result = await writeEnvFile({
      projectRoot: ctx.projectRoot,
      filePath,
      entries
    });

    return {
      type: this.type,
      filePath,
      changed: result.changed,
      warnings: current.content === rawPatch.value
        ? [{ code: "ENV_NOOP", level: "info", message: "内容未变化" }]
        : undefined
    };
  }
}
