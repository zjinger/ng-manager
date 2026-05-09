import { mkdir, stat } from "node:fs/promises";
import { mkdirSync, statSync } from "node:fs";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    const st = await stat(dirPath);
    if (!st.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
    return;
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(dirPath, { recursive: true });
}

export function ensureDirSync(dirPath: string): void {
  try {
    const st = statSync(dirPath);
    if (!st.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
    return;
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  mkdirSync(dirPath, { recursive: true });
}
