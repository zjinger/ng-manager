import { readTextFile } from "@yinuo-ngm/shared";
import { resolveProjectFile } from "../../utils/config-path";
import { resolveAngularEnvironmentFilePath } from "./angular-environment.detector";
import type { ConfigDocument } from "../../types/config-document";
import { buildAngularEnvironmentSchema } from "./angular-environment.schema";

export interface AngularEnvironmentViewModel {
  files: Array<{
    filePath: string;
    kind: "angular-environment";
    readonly: false;
  }>;
}

export async function readAngularEnvironmentFile(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument<AngularEnvironmentViewModel, { raw: string }>> {
  const filePath = await resolveAngularEnvironmentFilePath(input.projectRoot, input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);
  const content = await readTextFile(absPath, { allowMissing: true, defaultValue: "" });

  return {
    id: `angular-environment:${filePath}`,
    type: "angular-environment",
    title: "Angular 环境文件",
    projectRoot: input.projectRoot,
    filePath,
    raw: { raw: content },
    viewModel: {
      files: [
        {
          filePath,
          kind: "angular-environment",
          readonly: false
        }
      ]
    },
    schema: buildAngularEnvironmentSchema()
  };
}

