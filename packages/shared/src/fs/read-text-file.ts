import { readFile } from "node:fs/promises";

export interface ReadTextFileOptions {
  encoding?: BufferEncoding;
  allowMissing?: boolean;
  defaultValue?: string;
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

export async function readTextFile(
  filePath: string,
  options: ReadTextFileOptions = {}
): Promise<string> {
  const { encoding = "utf8", allowMissing = false, defaultValue } = options;

  try {
    return await readFile(filePath, { encoding });
  } catch (error) {
    if (allowMissing && isNodeError(error) && error.code === "ENOENT") {
      return defaultValue ?? "";
    }

    throw new Error(`Failed to read text file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
