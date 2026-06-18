const exporter = require("./exporter");
const normalize = require("../sketch/normalize-layer");
const indexGenerator = require("./document-index-generator");

import type { ArtboardExportRecordDto } from "../types/runtime";
import type { BuildArtboardRecordOptions } from "./export-types";

export function relativePath(rootDir: string | null | undefined, absPath: string | null | undefined): string {
  if (!rootDir || !absPath) {
    return absPath || "";
  }
  const root = String(rootDir).replace(/\/+$/g, "");
  const abs = String(absPath);
  if (abs.indexOf(root + "/") === 0) {
    return abs.slice(root.length + 1);
  }
  if (abs === root) {
    return "";
  }
  return abs;
}

export function computeArtboardOutputDir(
  rootOutputDir: string,
  page: SketchPageLike,
  artboard: SketchLayerLike,
  pageIndex: number,
  artboardInPageIndex: number,
): string {
  const pageName = exporter.sanitizeName(page && page.name ? page.name : "Page");
  const artboardName = exporter.sanitizeName(artboard.name || "Untitled Artboard");
  const shortId = normalize.shortHash(String(artboard.id || ""));
  const pageDirName = "page-" + indexGenerator.pad3(pageIndex + 1) + "-" + pageName;
  const abDirName =
    "artboard-" +
    indexGenerator.pad3(artboardInPageIndex + 1) +
    "-" +
    artboardName +
    "__" +
    shortId;
  return exporter.joinPath(rootOutputDir, pageDirName, abDirName);
}

export function buildArtboardRecord(options: BuildArtboardRecordOptions): ArtboardExportRecordDto {
  const relPackageDir = relativePath(options.rootOutputDir, options.outputDir);
  return {
    pageIndex: options.pageIndex,
    pageId: String((options.page && options.page.id) || ""),
    pageName: (options.page && options.page.name) || "",
    artboardIndex: options.artboardInPageIndex,
    shortId: options.shortId,
    artboardName: options.artboard.name || "",
    packageDir: relPackageDir,
    screenshotPath: null,
    previewHtmlPath: null,
    status: options.status,
    reason: options.reason || null,
    warnings: [],
    outputDir: options.outputDir,
  };
}
