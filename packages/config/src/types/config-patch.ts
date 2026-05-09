import type { JsonPatch } from "@yinuo-ngm/shared";
import type { ConfigWarning } from "./config-error";

export type ConfigPatch = JsonPatch;

export interface ConfigWriteResult {
  type: string;
  filePath: string;
  changed: boolean;
  backupPath?: string;
  warnings?: ConfigWarning[];
}

export interface ConfigPreviewResult {
  type: string;
  filePath: string;
  before: unknown;
  after: unknown;
  patches: ConfigPatch[];
  warnings?: ConfigWarning[];
}
