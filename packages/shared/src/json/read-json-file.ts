import { fileExists } from "../fs/file-exists";
import { readTextFile } from "../fs/read-text-file";
import { ReadJsonFileOptions } from "./json.types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function readJsonFile<T = unknown>(
  filePath: string,
  options: ReadJsonFileOptions<T> = {}
): Promise<T> {
  const { encoding = "utf8", allowMissing = false, defaultValue } = options;

  try {
    if (allowMissing) {
      const exists = await fileExists(filePath);
      if (!exists) {
        return defaultValue as T;
      }
    }

    const text = await readTextFile(filePath, { encoding, allowMissing: false });

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${filePath}. ${toErrorMessage(error)}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Failed to parse JSON file:")) {
      throw error;
    }

    throw new Error(`Failed to read JSON file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
