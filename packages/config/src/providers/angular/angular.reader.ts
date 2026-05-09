import { readJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { buildAngularSchema } from "./angular.schema";
import { resolveAngularWorkspaceFile } from "./angular.detector";
import { buildAngularWorkspaceViewModel, type AngularProjectViewModel } from "./angular.viewmodel";
import { resolveProjectFile } from "../../utils/config-path";

function resolveTargetContainer(project?: AngularProjectViewModel): "architect" | "targets" {
  return project?.targetContainer ?? "architect";
}

function getConfigurationNames(configurations?: Record<string, unknown>): string[] {
  if (!configurations) {
    return [];
  }
  return Object.keys(configurations);
}

export async function readAngularWorkspace(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument> {
  const filePath = resolveAngularWorkspaceFile(input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);

  try {
    const raw = await readJsonFile<Record<string, unknown>>(absPath);
    const viewModel = buildAngularWorkspaceViewModel(raw);
    const normalizedRaw =
      raw.defaultProject === undefined && viewModel.selectedProjectName
        ? { ...raw, defaultProject: viewModel.selectedProjectName }
        : raw;
    return {
      id: `angular-workspace:${filePath}`,
      type: "angular-workspace",
      title: "Angular",
      projectRoot: input.projectRoot,
      filePath,
      raw: normalizedRaw,
      viewModel,
      schema: buildAngularSchema({
        projectName: viewModel.selectedProjectName,
        targetContainer: resolveTargetContainer(viewModel.selectedProject),
        buildDefaultConfiguration: viewModel.selectedProject?.build?.defaultConfiguration,
        serveDefaultConfiguration: viewModel.selectedProject?.serve?.defaultConfiguration,
        buildConfigurationNames: getConfigurationNames(viewModel.selectedProject?.build?.configurations),
        serveConfigurationNames: getConfigurationNames(viewModel.selectedProject?.serve?.configurations)
      })
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `配置解析失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
