import { rm, writeFile } from "node:fs/promises";
import { atomicWriteFile } from "../fs/atomic-write-file";
import { backupFile } from "../fs/backup-file";
import { fileExists } from "../fs/file-exists";
import { readTextFile } from "../fs/read-text-file";
import { ensureDir } from "../fs/ensure-dir";
import { dirname } from "node:path";
import { WriteJsonFileOptions, WriteJsonFileResult } from "./json.types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeJsonText(data: unknown, spaces: number, newline: boolean): string {
  const baseText = JSON.stringify(data, null, spaces);
  if (baseText === undefined) {
    throw new Error("JSON.stringify result is undefined.");
  }

  if (!newline) {
    return baseText;
  }

  return baseText.endsWith("\n") ? baseText : `${baseText}\n`;
}

export async function writeJsonFile<T = unknown>(
  filePath: string,
  data: T,
  options: WriteJsonFileOptions = {}
): Promise<WriteJsonFileResult> {
  const {
    encoding = "utf8",
    spaces = 2,
    ensureDir: needEnsureDir = true,
    newline = true,
    backup = false,
    cleanupBackupOnSuccess = false,
    backupSuffix,
    atomic = true
  } = options;

  try {
    const content = normalizeJsonText(data, spaces, newline);
    const exists = await fileExists(filePath);
    const currentContent = await readTextFile(filePath, {
      encoding,
      allowMissing: true,
      defaultValue: ""
    });

    if (exists && currentContent === content) {
      return {
        filePath,
        changed: false
      };
    }

    let backupPath: string | undefined;
    if (backup) {
      const backupResult = await backupFile(
        filePath,
        backupSuffix ? { suffix: backupSuffix, timestamp: false } : {}
      );
      backupPath = backupResult?.backupPath;
    }

    if (atomic) {
      await atomicWriteFile(filePath, content, {
        encoding,
        ensureDir: needEnsureDir
      });
    } else {
      if (needEnsureDir) {
        await ensureDir(dirname(filePath));
      }
      await writeFile(filePath, content, { encoding });
    }

    if (cleanupBackupOnSuccess && backupPath) {
      await rm(backupPath, { force: true });
      backupPath = undefined;
    }

    return {
      filePath,
      backupPath,
      changed: true
    };
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
