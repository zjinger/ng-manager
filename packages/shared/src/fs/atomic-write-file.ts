import { dirname } from "node:path";
import { rename, unlink, writeFile } from "node:fs/promises";
import { ensureDir } from "./ensure-dir";

export interface AtomicWriteFileOptions {
  encoding?: BufferEncoding;
  ensureDir?: boolean;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function atomicWriteFile(
  filePath: string,
  content: string,
  options: AtomicWriteFileOptions = {}
): Promise<void> {
  const { encoding = "utf8", ensureDir: needEnsureDir = false } = options;
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;

  try {
    if (needEnsureDir) {
      await ensureDir(dirname(filePath));
    }

    await writeFile(tmpPath, content, { encoding });
    await rename(tmpPath, filePath);
  } catch (error) {
    try {
      await unlink(tmpPath);
    } catch (cleanupError) {
      if (!isNodeError(cleanupError) || cleanupError.code !== "ENOENT") {
        // ignore cleanup error, keep original error as primary
      }
    }

    throw new Error(`Failed to atomic write file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
