import { readJsoncFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { resolveProjectFile } from "../../utils/config-path";
import { resolveTsConfigFilePath } from "./tsconfig.detector";
import { buildTsConfigSchema } from "./tsconfig.schema";
import { resolveTsconfigExtends } from "./tsconfig-extends";
import { buildTsConfigViewModel } from "./tsconfig.viewmodel";

export async function readTsConfig(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument> {
  const filePath = await resolveTsConfigFilePath(input.projectRoot, input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);

  try {
    const raw = await readJsoncFile<Record<string, unknown>>(absPath);
    const resolved = await resolveTsconfigExtends({
      projectRoot: input.projectRoot,
      absPath
    });
    const viewModel = buildTsConfigViewModel(resolved);

    return {
      id: `tsconfig:${filePath}`,
      type: "tsconfig",
      title: "TypeScript",
      projectRoot: input.projectRoot,
      filePath,
      raw,
      viewModel,
      schema: buildTsConfigSchema()
    };
  } catch (error) {
    throw new CoreError(`配置解析失败：${absPath}`, CoreErrorCodes.CONFIG_READ_FAILED, {
      filePath: absPath,
      cause: error
    });
  }
}
