import { applyJsonPatches, readJsonFile, updateJsonFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigPatch, ConfigPreviewResult, ConfigWriteResult } from "../../types/config-patch";
import { resolveProjectFile } from "../../utils/config-path";

function validatePatches(patches: ConfigPatch[]): void {
  for (const patch of patches) {
    if (!patch.path.startsWith("/") && patch.path !== "") {
      throw new CoreError(
        `Invalid config patch path: ${patch.path}`,
        CoreErrorCodes.CONFIG_PATCH_INVALID,
        { patch }
      );
    }
  }
}

export async function previewPackageJson(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigPreviewResult> {
  validatePatches(input.patches);
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const before = await readJsonFile<unknown>(absPath);
  const after = applyJsonPatches(before, input.patches);

  return {
    type: "package-json",
    filePath: input.filePath,
    before,
    after,
    patches: input.patches
  };
}

export async function writePackageJson(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigWriteResult> {
  validatePatches(input.patches);
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
      type: "package-json",
      filePath: input.filePath,
      changed: result.changed,
      backupPath: result.backupPath
    };
  } catch (error) {
    throw new CoreError(`配置写入失败：${absPath}`, CoreErrorCodes.CONFIG_WRITE_FAILED, {
      filePath: absPath,
      cause: error
    });
  }
}
