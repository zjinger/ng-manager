import { readJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { buildAngularSchema } from "./angular.schema";
import { resolveAngularWorkspaceFile } from "./angular.detector";
import { buildAngularWorkspaceViewModel } from "./angular.viewmodel";
import { resolveProjectFile } from "../../utils/config-path";

export async function readAngularWorkspace(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument> {
  const filePath = resolveAngularWorkspaceFile(input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);

  try {
    const raw = await readJsonFile<Record<string, unknown>>(absPath);
    const viewModel = buildAngularWorkspaceViewModel(raw);
    return {
      id: `angular-workspace:${filePath}`,
      type: "angular-workspace",
      title: "Angular",
      projectRoot: input.projectRoot,
      filePath,
      raw,
      viewModel,
      schema: buildAngularSchema(viewModel.selectedProjectName)
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `配置解析失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
