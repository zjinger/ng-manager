import { applyJsonPatches, readJsonFile, updateJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigPreviewResult, ConfigWriteResult } from "../../types/config-patch";
import { resolveProjectFile } from "../../utils/config-path";
import type { ConfigPatch } from "../../types/config-patch";
import { validateJsonPointerPatches } from "../../utils/config-patch";

export async function previewAngularWorkspace(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigPreviewResult> {
  validateJsonPointerPatches(input.patches);
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const before = await readJsonFile<unknown>(absPath);
  const after = applyJsonPatches(before, input.patches);

  return {
    type: "angular-workspace",
    filePath: input.filePath,
    before,
    after,
    patches: input.patches
  };
}

export async function writeAngularWorkspace(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigWriteResult> {
  validateJsonPointerPatches(input.patches);
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);

  try {
    const result = await updateJsonFile(
      absPath,
      (json) => applyJsonPatches(json, input.patches),
      {
        backup: true,
        atomic: true,
        spaces: 2
      }
    );

    return {
      type: "angular-workspace",
      filePath: input.filePath,
      changed: result.changed,
      backupPath: result.backupPath
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `配置写入失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
