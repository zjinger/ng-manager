import { readTextFile } from "@yinuo-ngm/shared";
import { resolveProjectFile } from "../../utils/config-path";
import { resolveAngularEnvironmentFilePath } from "./angular-environment.detector";
import type { ConfigDocument } from "../../types/config-document";
import { buildAngularEnvironmentSchema } from "./angular-environment.schema";
import { parseAngularEnvironmentEntries, type AngularEnvironmentEntry } from "./angular-environment.viewmodel";

export interface AngularEnvironmentViewModel {
  filePath: string;
  entries: AngularEnvironmentEntry[];
  parseMode: "simple";
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
  const entries = parseAngularEnvironmentEntries(content);

  return {
    id: `angular-environment:${filePath}`,
    type: "angular-environment",
    title: "Angular 环境",
    projectRoot: input.projectRoot,
    filePath,
    raw: { raw: content },
    viewModel: {
      filePath,
      entries,
      parseMode: "simple",
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

