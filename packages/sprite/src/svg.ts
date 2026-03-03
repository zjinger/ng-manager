import fs from "node:fs";
import path from "node:path";
import type { GenerateSvgGroupOptions, GenerateSvgGroupResult, SvgIconMeta, SvgMetaFile } from "./types";
import { detectGroupType, parseGroupSize, defaultFileSort } from "./detect";
import { readMeta, writeMeta } from "./file";

// function buildSvgLessHint(prefix: string, group: string) {
//     const { width, height, size } = parseGroupSize(group);
//     return [
//         `.${prefix}-${size} {`,
//         `  width: ${width}px;`,
//         `  height: ${height}px;`,
//         `  display: inline-flex;`,
//         `  align-items: center;`,
//         `  justify-content: center;`,
//         `}`,
//         ``,
//     ].join("\n");
// }

export async function generateSvgGroup(opts: GenerateSvgGroupOptions): Promise<GenerateSvgGroupResult> {
    const { group, groupDir } = opts;

    if (!fs.existsSync(groupDir)) throw new Error(`Icon group not found: ${groupDir}`);

    const type = detectGroupType(groupDir);
    const prefix = opts.prefix || "sl";
    const { width: tileWidth, height: tileHeight, size } = parseGroupSize(group);

    // meta 输出路径
    const outDir = opts.outDir;
    if (!outDir) throw new Error("generateSvgGroup requires opts.outDir");
    fs.mkdirSync(outDir, { recursive: true });
    const metaSuffix = opts.cache?.metaSuffix ?? ".meta.json";
    const metaPath = path.join(outDir, `${group}${metaSuffix}`);

    const forceRefresh = opts.cache?.forceRefresh ?? false;
    const cacheEnabled = opts.cache?.enabled ?? true;

    if (cacheEnabled && !forceRefresh && fs.existsSync(metaPath)) {
        const meta = readMeta(metaPath) as SvgMetaFile;
        if (meta.mode === "svg") {
            const m = meta as SvgMetaFile;
            return {
                mode: "svg",
                group,
                type,
                icons: m.icons ?? [],
                lessText: "",
                metaPath
            };
        }
    }


    const svgs = fs.readdirSync(groupDir)
        .filter((f) => f.toLowerCase().endsWith(".svg"))
        .sort(defaultFileSort);

    const urlResolver =
        opts.urlResolver ||
        ((ctx: { group: string; file: string }) => `/icons/${ctx.group}/${encodeURIComponent(ctx.file)}`);

    const icons: SvgIconMeta[] = svgs.map((file) => {
        const base = path.basename(file, ".svg");
        const className = `${prefix}-${size}-${base}`;
        const url = urlResolver({ group, file });
        return { name: base, className, file, url };
    });
    // 生成 meta 文件，供后续使用（如 UI 预览）
    writeMeta(metaPath, {
        mode: "svg",
        group,
        tileWidth,
        tileHeight,
        prefix,
        size,
        icons,
    })

    return {
        mode: "svg",
        group,
        type,
        icons,
        lessText: '',
        metaPath
        // lessText: buildSvgLessHint(prefix, group),
    };
}
