import { readJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { resolveProjectFile } from "../../utils/config-path";
import { resolvePackageJsonFile } from "./package-json.detector";
import { buildPackageJsonSchema } from "./package-json.schema";
import { buildPackageJsonViewModel } from "./package-json.viewmodel";

export async function readPackageJson(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument> {
  const filePath = resolvePackageJsonFile(input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);

  try {
    const raw = await readJsonFile<Record<string, unknown>>(absPath);
    return {
      id: `package-json:${filePath}`,
      type: "package-json",
      title: "Package",
      projectRoot: input.projectRoot,
      filePath,
      raw,
      viewModel: buildPackageJsonViewModel(raw),
      schema: buildPackageJsonSchema()
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `配置解析失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
