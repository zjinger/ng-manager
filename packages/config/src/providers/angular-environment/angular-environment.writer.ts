import { readTextFile, writeTextFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { resolveProjectFile } from "../../utils/config-path";
import type { ConfigPatch, ConfigPreviewResult, ConfigWriteResult } from "../../types/config-patch";

type CoreErrorCode = (typeof CoreErrorCodes)[keyof typeof CoreErrorCodes];

function resolveRawPatch(input: {
  type: string;
  patches: ConfigPatch[];
  code: CoreErrorCode;
  message: string;
}): string {
  const rawPatch = input.patches.find((patch) => patch.op === "set" && patch.path === "/raw");
  if (!rawPatch || typeof rawPatch.value !== "string") {
    throw new CoreError(
      input.code,
      input.message,
      { type: input.type, patches: input.patches }
    );
  }
  return rawPatch.value;
}

export async function previewAngularEnvironmentFile(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigPreviewResult> {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const before = await readTextFile(absPath, { allowMissing: true, defaultValue: "" });
  const after = resolveRawPatch({
    type: "angular-environment",
    patches: input.patches,
    code: CoreErrorCodes.CONFIG_UNSUPPORTED_PREVIEW,
    message: "Angular 环境文件 Provider 当前仅支持通过 /raw 进行 set 预览"
  });

  return {
    type: "angular-environment",
    filePath: input.filePath,
    before,
    after,
    patches: input.patches
  };
}

export async function writeAngularEnvironmentFile(input: {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}): Promise<ConfigWriteResult> {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const current = await readTextFile(absPath, { allowMissing: true, defaultValue: "" });
  const after = resolveRawPatch({
    type: "angular-environment",
    patches: input.patches,
    code: CoreErrorCodes.CONFIG_UNSUPPORTED_WRITE,
    message: "Angular 环境文件 Provider 当前仅支持通过 /raw 进行 set 写入"
  });
  const result = await writeTextFile(absPath, after, { ensureDir: true, newline: true });

  return {
    type: "angular-environment",
    filePath: input.filePath,
    changed: result.changed,
    warnings: current === after ? [{ code: "ANGULAR_ENV_NOOP", level: "info", message: "内容未变化" }] : undefined
  };
}

