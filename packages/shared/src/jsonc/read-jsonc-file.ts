import { parse, printParseErrorCode } from "jsonc-parser";
import { fileExists } from "../fs/file-exists";
import { readTextFile } from "../fs/read-text-file";
import { ReadJsoncFileOptions } from "./jsonc.types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function readJsoncFile<T = unknown>(
  filePath: string,
  options: ReadJsoncFileOptions<T> = {}
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
    const errors: Array<{ error: number; offset: number; length: number }> = [];
    const parsed = parse(text, errors, {
      allowTrailingComma: true,
      disallowComments: false
    });

    if (errors.length > 0) {
      const first = errors[0];
      const code = printParseErrorCode(first.error);
      throw new Error(
        `Failed to parse JSONC file: ${filePath}. ${code} at offset ${first.offset}.`
      );
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Failed to parse JSONC file:")) {
      throw error;
    }

    throw new Error(`Failed to read JSONC file: ${filePath}. ${toErrorMessage(error)}`);
  }
}
