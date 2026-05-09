import type { EnvEntry } from "./env-format";

export interface EnvViewModel {
  files: Array<{
    filePath: string;
    entries: EnvEntry[];
  }>;
}
