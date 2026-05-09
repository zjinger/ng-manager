import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export function createReadError(filePath: string, cause: unknown): CoreError {
  return new CoreError(
    CoreErrorCodes.CONFIG_READ_FAILED,
    `配置读取失败：${filePath}`,
    { filePath, cause }
  );
}

export function createWriteError(filePath: string, cause: unknown): CoreError {
  return new CoreError(
    CoreErrorCodes.CONFIG_WRITE_FAILED,
    `配置写入失败：${filePath}`,
    { filePath, cause }
  );
}
