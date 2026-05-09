export interface ConfigDetectContext {
  projectRoot: string;
}

export interface ConfigReadContext {
  projectRoot: string;
  filePath?: string;
}

export interface ConfigSchemaContext {
  projectRoot: string;
  filePath?: string;
}

export interface ConfigWriteContext {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}

export interface ConfigPreviewContext {
  projectRoot: string;
  filePath: string;
  patches: ConfigPatch[];
}

export interface ConfigDetectResult {
  type: string;
  title: string;
  available: boolean;
  filePaths: string[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

import type { ConfigPatch } from "./config-patch";
