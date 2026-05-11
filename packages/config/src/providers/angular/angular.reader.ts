import { readJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { buildAngularSchema } from "./angular.schema";
import { resolveAngularWorkspaceFile } from "./angular.detector";
import { buildAngularWorkspaceViewModel, type AngularProjectViewModel } from "./angular.viewmodel";
import { resolveProjectFile } from "../../utils/config-path";
import { asObject } from "../../utils/config-utils";

function resolveTargetContainer(project?: AngularProjectViewModel): "architect" | "targets" {
  return project?.targetContainer ?? "architect";
}

function getConfigurationNames(configurations?: Record<string, unknown>): string[] {
  if (!configurations) {
    return [];
  }
  return Object.keys(configurations);
}

function resolveEffectiveField(input: {
  target: Record<string, unknown>;
  targetBase: string;
  key: string;
  defaultConfiguration?: string;
  defaultValue?: unknown;
}): { value: unknown; source: string } {
  const options = asObject(input.target.options);
  if (options[input.key] !== undefined) {
    return {
      value: options[input.key],
      source: `${input.targetBase}/options/${input.key}`
    };
  }

  if (input.defaultConfiguration) {
    const configs = asObject(input.target.configurations);
    const config = asObject(configs[input.defaultConfiguration]);
    if (config[input.key] !== undefined) {
      return {
        value: config[input.key],
        source: `${input.targetBase}/configurations/${input.defaultConfiguration}/${input.key}`
      };
    }
  }

  if (input.defaultValue !== undefined) {
    return {
      value: input.defaultValue,
      source: "(default)"
    };
  }

  return {
    value: undefined,
    source: "(undefined)"
  };
}

function buildAngularEffective(raw: Record<string, unknown>, viewModel: ReturnType<typeof buildAngularWorkspaceViewModel>) {
  const selectedProjectName = viewModel.selectedProjectName;
  const selectedProject = viewModel.selectedProject;
  const targetContainer = resolveTargetContainer(selectedProject);
  const project = asObject(asObject(raw.projects)[selectedProjectName ?? ""]);
  const targets = asObject(project[targetContainer]);
  const buildTarget = asObject(targets.build);
  const serveTarget = asObject(targets.serve);

  const buildDefaultConfiguration = selectedProject?.build?.defaultConfiguration;
  const serveDefaultConfiguration = selectedProject?.serve?.defaultConfiguration;
  const buildBase = `/projects/${selectedProjectName ?? "{projectName}"}/${targetContainer}/build`;
  const serveBase = `/projects/${selectedProjectName ?? "{projectName}"}/${targetContainer}/serve`;

  const outputPath = resolveEffectiveField({
    target: buildTarget,
    targetBase: buildBase,
    key: "outputPath"
  });
  const optimization = resolveEffectiveField({
    target: buildTarget,
    targetBase: buildBase,
    key: "optimization",
    defaultConfiguration: buildDefaultConfiguration,
    defaultValue: true
  });
  const sourceMap = resolveEffectiveField({
    target: buildTarget,
    targetBase: buildBase,
    key: "sourceMap",
    defaultConfiguration: buildDefaultConfiguration
  });
  const host = resolveEffectiveField({
    target: serveTarget,
    targetBase: serveBase,
    key: "host",
    defaultConfiguration: serveDefaultConfiguration,
    defaultValue: "localhost"
  });
  const port = resolveEffectiveField({
    target: serveTarget,
    targetBase: serveBase,
    key: "port",
    defaultConfiguration: serveDefaultConfiguration,
    defaultValue: 4200
  });
  const proxyConfig = resolveEffectiveField({
    target: serveTarget,
    targetBase: serveBase,
    key: "proxyConfig",
    defaultConfiguration: serveDefaultConfiguration
  });

  return {
    values: {
      selectedProject: selectedProjectName,
      targetContainer,
      build: {
        defaultConfiguration: buildDefaultConfiguration,
        outputPath: outputPath.value,
        optimization: optimization.value,
        sourceMap: sourceMap.value
      },
      serve: {
        defaultConfiguration: serveDefaultConfiguration,
        host: host.value,
        port: port.value,
        proxyConfig: proxyConfig.value
      }
    },
    sources: {
      "build.outputPath": outputPath.source,
      "build.optimization": optimization.source,
      "build.sourceMap": sourceMap.source,
      "serve.host": host.source,
      "serve.port": port.source,
      "serve.proxyConfig": proxyConfig.source
    }
  };
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
    const normalizedRaw: Record<string, unknown> =
      raw.defaultProject === undefined && viewModel.selectedProjectName
        ? { ...raw, defaultProject: viewModel.selectedProjectName }
        : raw;
    const rawWithEffective: Record<string, unknown> = {
      ...normalizedRaw,
      __ngmEffective: buildAngularEffective(normalizedRaw, viewModel)
    };
    return {
      id: `angular-workspace:${filePath}`,
      type: "angular-workspace",
      title: "Angular",
      projectRoot: input.projectRoot,
      filePath,
      raw: rawWithEffective,
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
