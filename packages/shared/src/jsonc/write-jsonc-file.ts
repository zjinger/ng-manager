import { writeJsonFile } from "../json/write-json-file";
import { WriteJsoncFileOptions, WriteJsoncFileResult } from "./jsonc.types";

export async function writeJsoncFile<T = unknown>(
  filePath: string,
  data: T,
  options: WriteJsoncFileOptions = {}
): Promise<WriteJsoncFileResult> {
  if (options.preserveComments) {
    throw new Error("writeJsoncFile with preserveComments is not implemented yet.");
  }

  return writeJsonFile(filePath, data, options);
}
