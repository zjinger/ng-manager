import { readJsonFile } from "@yinuo-ngm/shared";
import type { ConfigProvider } from "../../types/config-provider";
import type { ConfigDetectContext, ConfigReadContext, ConfigSchemaContext, ConfigWriteContext } from "../../types/config-detect";
import type { ConfigDocument } from "../../types/config-document";
import type { ConfigWriteResult } from "../../types/config-patch";
import type { ConfigSchema } from "../../types/config-schema";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { resolveProjectFile } from "../../utils/config-path";
import { detectVueProject } from "./vue.detector";
import { buildVueSchema } from "./vue.schema";
import type { VueProjectViewModel } from "./vue.viewmodel";

function asRecordOfString(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

export class VueConfigProvider implements ConfigProvider {
  readonly type = "vue-project";
  readonly title = "Vue";
  readonly description = "Vue 项目只读聚合视图";

  async detect(ctx: ConfigDetectContext) {
    return detectVueProject(ctx.projectRoot);
  }

  async read(ctx: ConfigReadContext): Promise<ConfigDocument<VueProjectViewModel>> {
    const detectResult = await detectVueProject(ctx.projectRoot);
    const packageFilePath = "package.json";
    const packageAbsPath = resolveProjectFile(ctx.projectRoot, packageFilePath);
    const pkg = await readJsonFile<Record<string, unknown>>(packageAbsPath, {
      allowMissing: true,
      defaultValue: {}
    });

    const dependencies =
      typeof pkg.dependencies === "object" && pkg.dependencies !== null
        ? (pkg.dependencies as Record<string, unknown>)
        : {};
    const devDependencies =
      typeof pkg.devDependencies === "object" && pkg.devDependencies !== null
        ? (pkg.devDependencies as Record<string, unknown>)
        : {};

    const viewModel: VueProjectViewModel = {
      isVueProject: detectResult.available,
      isVue3: typeof dependencies.vue === "string" && dependencies.vue.startsWith("^3"),
      isVite:
        typeof devDependencies.vite === "string" ||
        detectResult.filePaths.some((item) => item.startsWith("vite.config")),
      vueVersion: typeof dependencies.vue === "string" ? dependencies.vue : undefined,
      viteVersion: typeof devDependencies.vite === "string" ? devDependencies.vite : undefined,
      entryFiles: detectResult.filePaths.filter((item) => item.startsWith("src/")),
      configFiles: detectResult.filePaths.filter((item) => !item.startsWith("src/")),
      scripts: asRecordOfString(pkg.scripts)
    };

    return {
      id: "vue-project:overview",
      type: this.type,
      title: this.title,
      projectRoot: ctx.projectRoot,
      filePath: ctx.filePath ?? packageFilePath,
      raw: pkg,
      viewModel,
      schema: buildVueSchema(),
      readonly: true
    };
  }

  async getSchema(_ctx: ConfigSchemaContext): Promise<ConfigSchema> {
    return buildVueSchema();
  }

  async write(_ctx: ConfigWriteContext): Promise<ConfigWriteResult> {
    throw new CoreError(
      "当前 Provider 不支持写入：vue-project",
      CoreErrorCodes.CONFIG_UNSUPPORTED_WRITE,
      { type: this.type }
    );
  }
}
