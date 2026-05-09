import { writeTextFile } from "@yinuo-ngm/shared";
import { resolveProjectFile } from "../../utils/config-path";
import type { EnvEntry } from "./env-format";
import { serializeEnvEntries } from "./env-format";

export async function writeEnvFile(input: {
  projectRoot: string;
  filePath: string;
  entries: EnvEntry[];
}) {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const content = serializeEnvEntries(input.entries);
  return writeTextFile(absPath, content, { ensureDir: true, newline: true });
}
