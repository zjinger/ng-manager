// DTO 类型边界：用于 layer-tree.json / assets-map.json / export-result.json / handoff-index.json
// 不依赖 Sketch / Cocoa 运行时，可在 Node 和 Sketch 两侧使用。

export interface RectDto {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayerType =
  | "Artboard"
  | "Group"
  | "SymbolInstance"
  | "SymbolMaster"
  | "Text"
  | "Shape"
  | "ShapePath"
  | "Vector"
  | "Image"
  | "Bitmap"
  | "Slice"
  | "HotSpot"
  | string;

export interface HandoffTextDto {
  id?: string;
  name?: string;
  text?: string | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: string | null;
  color?: string | null;
  frame?: RectDto;
}

export interface HandoffLayerNodeDto {
  id: string;
  handoffId: string;
  layerId?: string;
  parentId?: string | null;
  artboardId?: string | null;
  name: string;
  type: LayerType;
  role?: string | null;
  frame: RectDto;
  absoluteFrame?: RectDto;
  zIndex?: number;
  visible?: boolean;
  hidden?: boolean;
  locked?: boolean;
  text?: string | null;
  styleRef?: string | null;
  children?: HandoffLayerNodeDto[];
  path?: string[];
  domSelector?: string;
}

export type AssetType =
  | "slice"
  | "bitmap"
  | "icon"
  | "logo"
  | "symbol"
  | "vector"
  | "exportable"
  | "misc"
  | string;

export type AssetFormat = "png" | "svg" | "jpg" | "webp" | "pdf" | string;

export type AssetExportStatus = "success" | "failed" | "pending" | "unknown";

export interface AssetRecordDto {
  id: string;
  name?: string;
  layerId?: string;
  handoffId?: string | null;
  sourceLayerType?: string;
  type?: AssetType;
  format?: AssetFormat;
  path?: string;
  width?: number;
  height?: number;
  exportStatus?: AssetExportStatus;
  warnings?: string[];
}

export interface AssetsMapDto {
  version?: string;
  documentName?: string;
  exportedAt?: string;
  assets: AssetRecordDto[];
}

export type ExportItemStatus = "success" | "failed" | "skipped" | string;

export interface ArtboardExportRecordDto {
  pageIndex: number;
  pageId?: string;
  pageName?: string;
  artboardIndex: number;
  shortId: string;
  artboardName: string;
  packageDir?: string;
  screenshotPath?: string | null;
  previewHtmlPath?: string | null;
  status: ExportItemStatus;
  reason?: string | null;
  warnings?: string[];
}

export interface ExportResultWarningDto {
  artboardName?: string;
  message: string;
}

export interface ExportResultErrorDto {
  artboardName?: string;
  message: string;
}

export interface ExportResultDto {
  mode?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  documentName?: string;
  pageName?: string;
  outputRoot?: string;
  totalArtboards?: number;
  successCount?: number;
  failedCount?: number;
  items: ArtboardExportRecordDto[];
  warnings?: ExportResultWarningDto[];
  errors?: ExportResultErrorDto[];
  logPath?: string;
}

export interface DocumentIndexArtboardDto {
  index: string;
  shortId: string;
  name: string;
  packageDir?: string;
  screenshot?: string | null;
  previewHtml?: string | null;
  status: ExportItemStatus;
  reason?: string | null;
}

export interface DocumentIndexPageDto {
  index: string;
  pageId?: string;
  pageName?: string;
  artboards: DocumentIndexArtboardDto[];
}

export interface DocumentIndexSummaryDto {
  pageTotal: number;
  artboardTotal: number;
  successTotal: number;
  failedTotal: number;
  warningTotal: number;
}

export interface DocumentIndexDto {
  specVersion?: string;
  documentName?: string;
  exportedAt?: string;
  mode?: string;
  outputRoot?: string;
  pages: DocumentIndexPageDto[];
  artboards: DocumentIndexArtboardDto[];
  summary: DocumentIndexSummaryDto;
  warnings?: string[];
  errors?: string[];
}
