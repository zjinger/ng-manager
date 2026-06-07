import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentConnectionsRootRecord } from "./agent-connections.types";

type ReadJsonResult = {
  exists: boolean;
  value?: AgentConnectionsRootRecord;
};

export async function readJsonObjectIfExists(filePath: string): Promise<ReadJsonResult> {
  try {
    await access(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false };
    }
    throw new GlobalError(
      GlobalErrorCodes.STORAGE_IO_ERROR,
      "failed to access agent connections config",
      { filePath, cause: error instanceof Error ? error.message : String(error) }
    );
  }

  const text = await readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new GlobalError(
      GlobalErrorCodes.BAD_JSON,
      "agent connections config JSON parse failed",
      { filePath, cause: error instanceof Error ? error.message : String(error) }
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GlobalError(
      GlobalErrorCodes.BAD_JSON,
      "agent connections config must be a JSON object",
      { filePath }
    );
  }

  return {
    exists: true,
    value: parsed as AgentConnectionsRootRecord,
  };
}

export async function writeJsonAtomic(filePath: string, value: AgentConnectionsRootRecord): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tmpPath, content, { encoding: "utf8", mode: 0o600 });
  await rename(tmpPath, filePath);
}
