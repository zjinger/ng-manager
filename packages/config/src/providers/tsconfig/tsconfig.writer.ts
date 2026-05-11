import { applyJsonPatches, readJsoncFile, updateJsoncFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigPatch, ConfigPreviewResult, ConfigWriteResult } from "../../types/config-patch";
import { resolveProjectFile } from "../../utils/config-path";
import { validateJsonPointerPatches } from "../../utils/config-patch";

export async function previewTsConfig(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigPreviewResult> {
  validateJsonPointerPatches(input.patches);
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const before = await readJsoncFile<unknown>(absPath);
  const after = applyJsonPatches(before, input.patches);

  return {
    type: "tsconfig",
    filePath: input.filePath,
    before,
    after,
    patches: input.patches
  };
}

export async function writeTsConfig(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigWriteResult> {
  validateJsonPointerPatches(input.patches);
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);

  try {
    const result = await updateJsoncFile(
      absPath,
      (json) => applyJsonPatches(json, input.patches),
      {
        backup: true,
        atomic: true,
        spaces: 2
      }
    );

    return {
      type: "tsconfig",
      filePath: input.filePath,
      changed: result.changed,
      backupPath: result.backupPath,
      warnings: [
        {
          code: "TSCONFIG_COMMENT_LOSS",
          level: "warning",
          message: "JSONC 写回可能丢失注释，后续可通过 preserveComments 支持保留注释。"
        }
      ]
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `配置写入失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
