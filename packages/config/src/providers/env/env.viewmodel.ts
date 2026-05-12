import type { EnvEntry } from "./env-format";

export interface EnvViewModel {
  filePath?: string;
  entries?: EnvEntry[];
  files: Array<{
    filePath: string;
    entries: EnvEntry[];
  }>;
}
