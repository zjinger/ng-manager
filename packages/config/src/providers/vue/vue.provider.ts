import { readJsonFile } from "@yinuo-ngm/shared";
import type { ConfigProvider } from "../../types/config-provider";
import type { ConfigDetectContext, ConfigReadContext } from "../../types/config-detect";
import type { ConfigDocument } from "../../types/config-document";
import type { ConfigSchema } from "../../types/config-schema";
import { resolveProjectFile } from "../../utils/config-path";
import { detectVueProject, detectVueRelatedFiles, VUE_PROJECT_OVERVIEW_FILE_PATH } from "./vue.detector";
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

function getPackageVersion(
  dependencies: Record<string, unknown>,
  devDependencies: Record<string, unknown>,
  name: string
): string | undefined {
  const version = dependencies[name] ?? devDependencies[name];
  return typeof version === "string" ? version : undefined;
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
    const relatedFiles = await detectVueRelatedFiles(ctx.projectRoot);
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
      projectName: typeof pkg.name === "string" ? pkg.name : undefined,
      isVueProject: detectResult.available,
      isVue3: /(^|[^\d])3(\.\d+)?/.test(getPackageVersion(dependencies, devDependencies, "vue") ?? ""),
      isVite:
        typeof getPackageVersion(dependencies, devDependencies, "vite") === "string" ||
        relatedFiles.some((item) => item.startsWith("vite.config")),
      vueVersion: getPackageVersion(dependencies, devDependencies, "vue"),
      viteVersion: getPackageVersion(dependencies, devDependencies, "vite"),
      vueRouterVersion: getPackageVersion(dependencies, devDependencies, "vue-router"),
      piniaVersion: getPackageVersion(dependencies, devDependencies, "pinia"),
      antDesignVueVersion: getPackageVersion(dependencies, devDependencies, "ant-design-vue"),
      entryFiles: relatedFiles.filter((item) => item.startsWith("src/")),
      configFiles: relatedFiles.filter((item) => item.startsWith("vite.config")),
      scripts: asRecordOfString(pkg.scripts)
    };

    return {
      id: "vue-project:overview",
      type: this.type,
      title: this.title,
      projectRoot: ctx.projectRoot,
      filePath: ctx.filePath ?? VUE_PROJECT_OVERVIEW_FILE_PATH,
      raw: pkg,
      viewModel,
      schema: buildVueSchema(),
      readonly: true
    };
  }

  async getSchema(_ctx: ConfigReadContext): Promise<ConfigSchema> {
    return buildVueSchema();
  }
}
