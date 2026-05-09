import { fileExists } from "@yinuo-ngm/shared";
import { resolveProjectFile } from "./config-path";

export async function detectExistingFiles(
  projectRoot: string,
  candidates: string[]
): Promise<string[]> {
  const checks = await Promise.all(
    candidates.map(async (candidate) => {
      const absPath = resolveProjectFile(projectRoot, candidate);
      const exists = await fileExists(absPath);
      return exists ? candidate : undefined;
    })
  );

  return checks.filter((item): item is string => typeof item === "string");
}
