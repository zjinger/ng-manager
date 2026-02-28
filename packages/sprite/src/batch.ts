import fs from "node:fs";
import path from "node:path";
import { detectGroupType } from "./detect";
import { generatePngGroup } from "./png";
import { generateSvgGroup } from "./svg";
import type {
    GenerateGroupBatchItem,
    GenerateGroupBatchOptions,
    GenerateGroupBatchResult,
    GeneratePngGroupOptions
} from "./types";
const DEFAULT_SKIP_GROUPS = new Set([
    ".svn",
    ".git",
    ".hg",
    ".DS_Store",
    "__MACOSX",
    "Thumbs.db",
]);

function defaultGroupFilter(name: string) {
    if (!name) return false;
    if (DEFAULT_SKIP_GROUPS.has(name)) return false;
    // 统一跳过所有“点目录”
    if (name.startsWith(".")) return false;
    return true;
}
function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
}

function listGroupDirs(root: string, groupFilter?: (name: string) => boolean): string[] {
    if (!fs.existsSync(root)) return [];
    const filter = groupFilter ?? defaultGroupFilter;
    return fs
        .readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((name) => filter(name));
}

function applyGroupTemplate(tpl: string, group: string) {
    return tpl.replace(/{group}/g, group);
}

async function runPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const limit = Math.max(1, Math.min(8, concurrency | 0));
    const results: R[] = new Array(items.length);
    let next = 0;

    await Promise.all(
        new Array(limit).fill(0).map(async () => {
            while (true) {
                const i = next++;
                if (i >= items.length) break;
                results[i] = await worker(items[i], i);
            }
        })
    );
    return results;
}

/**
 * 批量生成所有 group 的 sprite/svg 结果
 * - png：调用 generatePngGroup
 * - svg：调用 generateSvgGroup
 * - mixed/empty：视为错误（返回 ok:false item）
 */
export async function generateGroupBatch(opts: GenerateGroupBatchOptions): Promise<GenerateGroupBatchResult> {
    const iconsRoot = String(opts.iconsRoot ?? "").trim();
    const outDir = String(opts.outDir ?? "").trim();
    const spriteUrlTemplate = String(opts.spriteUrlTemplate ?? "").trim();

    if (!iconsRoot) throw new Error("iconsRoot is required");
    if (!outDir) throw new Error("outDir is required");
    if (!spriteUrlTemplate) throw new Error("spriteUrlTemplate is required");

    if (!fs.existsSync(iconsRoot)) {
        throw new Error(`iconsRoot not found: ${iconsRoot}`);
    }

    ensureDir(outDir);

    const prefix = String(opts.prefix ?? "sl").trim() || "sl";
    const algorithm = opts.algorithm ?? "binary-tree";
    const cache = opts.cache ?? { enabled: true };
    const concurrency = opts.concurrency ?? 1;
    const continueOnError = opts.continueOnError ?? true;

    const groups = (opts.groups?.length ? opts.groups : listGroupDirs(iconsRoot, opts.groupFilter))
        .map((g) => String(g ?? "").trim())
        .filter(Boolean);

    if (!groups.length) {
        return { ok: true, total: 0, success: 0, failed: 0, items: [] };
    }
    const items = await runPool(groups, concurrency, async (group) => {
        const groupDir = path.join(iconsRoot, group);
        try {
            const type = detectGroupType(groupDir);
            if (type === "empty") throw new Error(`group "${group}" is empty`);
            if (type === "mixed") throw new Error(`group "${group}" has both png and svg (mixed)`);

            if (type === "svg") {
                const result = await generateSvgGroup({
                    group,
                    groupDir,
                    prefix,
                    urlResolver: opts.svgUrlResolver,
                });
                return { ok: true, group, type, result } as GenerateGroupBatchItem;
            }

            // png
            const spriteUrl = applyGroupTemplate(spriteUrlTemplate, group);

            const pngOpts: GeneratePngGroupOptions = {
                group,
                groupDir,
                outDir,
                spriteUrl,
                css: {
                    prefix,
                    spriteUrlResolver: ({ spriteUrl }) => spriteUrl,
                },
                cache: {
                    enabled: cache.enabled ?? true,
                    forceRefresh: cache.forceRefresh ?? false,
                    metaSuffix: cache.metaSuffix,
                    persistLess: cache.persistLess ?? true,
                },
                spritesmith: { algorithm },
            };

            const result = await generatePngGroup(pngOpts);
            return { ok: true, group, type: "png", result } as GenerateGroupBatchItem;
        } catch (e: any) {
            const item = { ok: false, group, error: e?.message || String(e) } as GenerateGroupBatchItem;
            if (!continueOnError) throw e;
            return item;
        }
    });

    const success = items.filter((x) => (x as any).ok).length;
    const failed = items.length - success;

    return {
        ok: failed === 0,
        total: items.length,
        success,
        failed,
        items,
    };
}