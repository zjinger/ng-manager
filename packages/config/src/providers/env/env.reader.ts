import { readTextFile } from "@yinuo-ngm/shared";
import { resolveProjectFile } from "../../utils/config-path";
import { parseEnvContent } from "./env-format";

export async function readEnvFile(input: {
  projectRoot: string;
  filePath: string;
}): Promise<{ content: string; entries: ReturnType<typeof parseEnvContent> }> {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const content = await readTextFile(absPath, { allowMissing: true, defaultValue: "" });
  return {
    content,
    entries: parseEnvContent(content)
  };
}
