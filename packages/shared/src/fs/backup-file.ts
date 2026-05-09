import { copyFile } from "node:fs/promises";
import { fileExists } from "./file-exists";

export interface BackupFileOptions {
  suffix?: string;
  timestamp?: boolean;
}

export interface BackupFileResult {
  sourcePath: string;
  backupPath: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function buildBackupPath(filePath: string, options: BackupFileOptions): string {
  const suffix = options.suffix ?? ".legacy";
  const withTimestamp = options.timestamp ?? true;

  if (!withTimestamp) {
    return `${filePath}${suffix}`;
  }

  return `${filePath}${suffix}.${Date.now()}`;
}

export async function backupFile(
  filePath: string,
  options: BackupFileOptions = {}
): Promise<BackupFileResult | null> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return null;
    }

    const backupPath = buildBackupPath(filePath, options);
    await copyFile(filePath, backupPath);

    return {
      sourcePath: filePath,
      backupPath
    };
  } catch (error) {
    throw new Error(`Failed to backup file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
