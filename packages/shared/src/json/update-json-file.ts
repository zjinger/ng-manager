import { ReadJsonFileOptions, WriteJsonFileOptions, WriteJsonFileResult } from "./json.types";
import { readJsonFile } from "./read-json-file";
import { writeJsonFile } from "./write-json-file";

export interface UpdateJsonFileOptions<T = unknown>
  extends ReadJsonFileOptions<T>,
    WriteJsonFileOptions {}

export async function updateJsonFile<T = unknown>(
  filePath: string,
  updater: (current: T) => T | Promise<T>,
  options: UpdateJsonFileOptions<T> = {}
): Promise<WriteJsonFileResult> {
  const current = await readJsonFile<T>(filePath, options);
  const next = await updater(current);
  return writeJsonFile(filePath, next, options);
}
