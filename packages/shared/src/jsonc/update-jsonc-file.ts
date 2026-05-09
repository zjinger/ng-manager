import { readJsoncFile } from "./read-jsonc-file";
import { writeJsoncFile } from "./write-jsonc-file";
import {
  ReadJsoncFileOptions,
  WriteJsoncFileOptions,
  WriteJsoncFileResult
} from "./jsonc.types";

export interface UpdateJsoncFileOptions<T = unknown>
  extends ReadJsoncFileOptions<T>,
    WriteJsoncFileOptions {}

export async function updateJsoncFile<T = unknown>(
  filePath: string,
  updater: (current: T) => T | Promise<T>,
  options: UpdateJsoncFileOptions<T> = {}
): Promise<WriteJsoncFileResult> {
  const current = await readJsoncFile<T>(filePath, options);
  const next = await updater(current);
  return writeJsoncFile(filePath, next, options);
}
