import { readFileSync } from "fs";
import JSZip from "jszip";
import { SketchMeta, SketchDocument, SketchPage } from "./types";

export interface UnzippedSketch {
  meta: SketchMeta;
  document: SketchDocument;
  pages: Map<string, SketchPage>;
  images: Map<string, Buffer>;
}

export async function unzipSketchFile(filePath: string): Promise<UnzippedSketch> {
  const data = readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  const result: UnzippedSketch = {
    meta: {} as SketchMeta,
    document: {} as SketchDocument,
    pages: new Map(),
    images: new Map(),
  };

  // 读取 meta.json
  const metaFile = zip.file("meta.json");
  if (metaFile) {
    const content = await metaFile.async("string");
    result.meta = JSON.parse(content) as SketchMeta;
  } else {
    throw new Error("meta.json not found in .sketch file");
  }

  // 读取 document.json
  const documentFile = zip.file("document.json");
  if (documentFile) {
    const content = await documentFile.async("string");
    result.document = JSON.parse(content) as SketchDocument;
  } else {
    throw new Error("document.json not found in .sketch file");
  }

  // 读取 pages 目录
  const pagesFolder = zip.folder("pages");
  if (pagesFolder) {
    const pageFiles: string[] = [];
    pagesFolder.forEach((relativePath, file) => {
      if (relativePath.endsWith(".json") && !file.dir) {
        pageFiles.push(relativePath);
      }
    });

    for (const pageFile of pageFiles) {
      const file = zip.file(`pages/${pageFile}`);
      if (file) {
        const content = await file.async("string");
        const pageId = pageFile.replace(".json", "");
        try {
          const page = JSON.parse(content) as SketchPage;
          result.pages.set(pageId, page);
        } catch (error) {
          console.warn(`Failed to parse page ${pageId}:`, error);
        }
      }
    }
  }

  // 读取 images 目录
  const imagesFolder = zip.folder("images");
  if (imagesFolder) {
    const imageFiles: string[] = [];
    imagesFolder.forEach((relativePath, file) => {
      if (!file.dir) {
        imageFiles.push(relativePath);
      }
    });

    for (const imageFile of imageFiles) {
      const file = zip.file(`images/${imageFile}`);
      if (file) {
        const content = await file.async("nodebuffer");
        result.images.set(imageFile, content);
      }
    }
  }

  return result;
}

/**
 * 检查版本兼容性
 */
export function checkVersionCompatibility(meta: SketchMeta): {
  supported: boolean;
  warnings: string[];
  unsupportedFeatures: string[];
} {
  const warnings: string[] = [];
  const unsupportedFeatures: string[] = [];

  // 支持的文档版本范围
  const SUPPORTED_DOCUMENT_VERSIONS = {
    min: 119, // Sketch 55.2
    max: 146, // 最新支持的版本
  };

  // 检查文档版本
  const supported = meta.version >= SUPPORTED_DOCUMENT_VERSIONS.min &&
    meta.version <= SUPPORTED_DOCUMENT_VERSIONS.max;

  if (!supported) {
    warnings.push(`Document version ${meta.version} may not be fully supported`);
  }

  // 检查应用版本
  const majorVersion = parseInt(meta.appVersion.split(".")[0], 10);
  if (majorVersion >= 83) {
    warnings.push(`App version ${meta.appVersion} may have features not fully supported`);
    unsupportedFeatures.push("Variables (design tokens)");
    unsupportedFeatures.push("Component slots");
  }

  // 检查新版本格式（2025.x, 2026.x）
  if (meta.appVersion.startsWith("2025") || meta.appVersion.startsWith("2026")) {
    warnings.push(`App version ${meta.appVersion} is a newer version format`);
    unsupportedFeatures.push("Variables (design tokens)");
    unsupportedFeatures.push("Component slots");
    unsupportedFeatures.push("Advanced prototyping features");
  }

  return {
    supported: true, // 基本结构仍然兼容
    warnings,
    unsupportedFeatures,
  };
}
