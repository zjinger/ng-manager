import type { ConfigSchema } from "./config-schema.model";

export interface ConfigProviderItem {
  type: string;
  title: string;
  description?: string;
}

export interface ConfigDetectResult {
  type: string;
  title: string;
  available: boolean;
  filePaths: string[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfigWarning {
  code: string;
  message: string;
  level?: "info" | "warning" | "error";
}

export interface ConfigDocument<TViewModel = unknown, TRaw = unknown> {
  id: string;
  type: string;
  title: string;
  projectRoot: string;
  filePath: string;
  raw: TRaw;
  viewModel: TViewModel;
  schema: ConfigSchema;
  readonly?: boolean;
  warnings?: ConfigWarning[];
  metadata?: Record<string, unknown>;
}

export interface ConfigPatch {
  op: "set" | "remove" | "append" | "merge";
  path: string;
  value?: unknown;
}

export interface ConfigPreviewResult {
  type: string;
  filePath: string;
  before: unknown;
  after: unknown;
  patches: ConfigPatch[];
  warnings?: ConfigWarning[];
}

export interface ConfigWriteResult {
  type: string;
  filePath: string;
  changed: boolean;
  backupPath?: string;
  warnings?: ConfigWarning[];
}
