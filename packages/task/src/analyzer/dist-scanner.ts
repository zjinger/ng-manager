import fs from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync } from "node:zlib";
import { calcGzipSize } from "./gzip-size";
import type { TaskAssetInfo, TaskAssetType } from "./task-analyzer.types";

const maxCompressedSizeBytes = 5 * 1024 * 1024;

function getAssetType(ext: string): TaskAssetType {
    const lower = ext.toLowerCase();

    if (lower === ".js" || lower === ".mjs" || lower === ".cjs") return "js";
    if (lower === ".css") return "css";
    if (lower === ".html") return "html";
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"].includes(lower)) return "image";
    if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(lower)) return "font";
    if (lower === ".map") return "map";

    return "asset";
}

function shouldCalculateCompressedSize(type: TaskAssetType, rawSize: number): boolean {
    return (type === "js" || type === "css" || type === "html") && rawSize <= maxCompressedSizeBytes;
}

export async function scanDistAssets(
    root: string,
    opts: { includeMap?: boolean } = {}
): Promise<TaskAssetInfo[]> {
    const assets: TaskAssetInfo[] = [];
    let rootStat: import("node:fs").Stats;

    try {
        rootStat = await fs.stat(root);
    } catch {
        return [];
    }

    if (!rootStat.isDirectory()) return [];

    async function walk(dir: string) {
        let entries: Array<import("node:fs").Dirent>;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
                continue;
            }

            if (!entry.isFile()) continue;

            const ext = path.extname(entry.name);
            if (!opts.includeMap && ext.toLowerCase() === ".map") continue;

            let buffer: Buffer;
            try {
                buffer = await fs.readFile(fullPath);
            } catch {
                continue;
            }
            const rawSize = buffer.length;
            const type = getAssetType(ext);
            const gzipSize = shouldCalculateCompressedSize(type, rawSize) ? calcGzipSize(buffer) : undefined;
            const brotliSize = shouldCalculateCompressedSize(type, rawSize) ? brotliCompressSync(buffer).length : undefined;

            assets.push({
                name: entry.name,
                path: fullPath,
                relativePath: path.relative(root, fullPath).replace(/\\/g, "/"),
                ext,
                type,
                rawSize,
                gzipSize,
                brotliSize,
            });
        }
    }

    await walk(root);

    const total = assets.reduce((sum, item) => sum + item.rawSize, 0);
    for (const asset of assets) {
        asset.ratio = total > 0 ? asset.rawSize / total : 0;
    }

    return assets.sort((a, b) => b.rawSize - a.rawSize);
}
