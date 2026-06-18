import type { ArtboardExportRecordDto } from "../types/runtime";

export type ExportMode = "selected" | "currentPage" | "wholeDocument" | "custom";

export interface ArtboardGroup {
  page: SketchPageLike;
  artboards: SketchLayerLike[];
}

export interface FlatArtboardEntry {
  page: SketchPageLike;
  artboard: SketchLayerLike;
}

export interface ScopeSelectionDto {
  pageId: string;
  artboardId: string;
}

export interface PluginSettingsDto {
  outputRoot: string;
  exportScreenshot?: boolean;
}

export interface ExportLoggerLike {
  logPath?: string;
  getStage(): string;
  setStage?(stage: string): void;
  step(stage: string, message: string, data?: unknown): unknown;
  info(stage: string, message: string, data?: unknown): unknown;
  warn(stage: string, message: string, data?: unknown): unknown;
  error(stage: string, message: string, error: unknown, data?: unknown): unknown;
}

export interface ExportReporterLike {
  begin(mode?: string, logPath?: string): void;
  close(): void;
  collected(total: number): void;
  raw(message: string): void;
  startArtboard(current: number, total: number, artboardName?: string): void;
  step(key: string, name?: string): void;
  success(artboard: SketchLayerLike, outputDir: string): void;
  failure(artboard: SketchLayerLike, error: unknown): void;
  warning(message: string): void;
  generatingIndex(): void;
  finish(success?: number, failed?: number): void;
  renderLog(): string;
}

export interface SafeRunContextLike {
  command?: string;
  commandLabel?: string;
  startedAt?: string;
  settings?: PluginSettingsDto;
  logger: ExportLoggerLike;
  logPath?: string;
  setStage?(stage: string): void;
}

export interface BuildArtboardRecordOptions {
  rootOutputDir: string;
  outputDir: string;
  page: SketchPageLike;
  artboard: SketchLayerLike;
  pageIndex: number;
  artboardInPageIndex: number;
  shortId: string;
  status: ArtboardExportRecordDto["status"];
  reason?: string | null;
}

export interface ExportSingleArtboardOptions {
  document: SketchDocumentLike;
  settings: PluginSettingsDto;
  rootOutputDir: string;
  page: SketchPageLike;
  artboard: SketchLayerLike;
  pageIndex: number;
  artboardInPageIndex: number;
  reporter: ExportReporterLike;
  logger: ExportLoggerLike;
  pluginVersion: string;
}

export interface FinalizeExportOptions {
  document: SketchDocumentLike;
  mode: ExportMode;
  groups: ArtboardGroup[];
  rootOutputDir: string;
  records: ArtboardExportRecordDto[];
  reporter: ExportReporterLike;
  context: SafeRunContextLike;
}

export interface EmptyExportResultOptions {
  document: SketchDocumentLike;
  mode: ExportMode;
  rootOutputDir: string;
  context: SafeRunContextLike;
  reason: string;
}

export interface ExportSummaryOptions {
  mode: ExportMode;
  modeLabel: string;
  groups?: ArtboardGroup[];
  records: ArtboardExportRecordDto[];
  rootOutputDir: string;
  logPath?: string;
  success: number;
  failed: number;
  warnings: number;
  stage?: string;
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}
