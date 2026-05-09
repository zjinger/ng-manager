import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export function createReadError(filePath: string, cause: unknown): CoreError {
  return new CoreError(
    `配置读取失败：${filePath}`,
    CoreErrorCodes.CONFIG_READ_FAILED,
    { filePath, cause }
  );
}

export function createWriteError(filePath: string, cause: unknown): CoreError {
  return new CoreError(
    `配置写入失败：${filePath}`,
    CoreErrorCodes.CONFIG_WRITE_FAILED,
    { filePath, cause }
  );
}
