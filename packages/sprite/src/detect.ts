import fs from "node:fs";
import path from "node:path";
import type { IconGroupType, SpriteClassMeta } from "./types";

/** detect png/svg/mixed/empty */
export function detectGroupType(groupDir: string): IconGroupType {
    if (!fs.existsSync(groupDir)) return "empty";
    const files = fs.readdirSync(groupDir);
    const hasPng = files.some((f) => f.toLowerCase().endsWith(".png"));
    const hasSvg = files.some((f) => f.toLowerCase().endsWith(".svg"));
    if (!hasPng && !hasSvg) return "empty";
    if (hasPng && hasSvg) return "mixed";
    return hasSvg ? "svg" : "png";
}

/**
 *  parse "10-10" => tile size 10x10; "12-16" => tile size 12x16; "20" => tile size 20x20
 *  group
 *   - 10 单个数字表示宽高相等的正方形图标，例如 10 表示 10x10 的图标
 *   - 10-10 表示宽高分别为 10 和 10 的图标，即 10x10 的图标
 *   - 12-16 表示宽为 12、高为 16 的图标
 */
export function parseGroupSize(group: string) {
    const [w, h] = group.split("-").map((n) => Number(n) || 0);
    const size = w || h || 0;
    const width = w || size;
    const height = h || size;
    return { size: w === h ? `${width}` : `${width}-${height}`, width, height };
}

export function defaultFileSort(a: string, b: string) {
    const an = Number(path.basename(a, path.extname(a)));
    const bn = Number(path.basename(b, path.extname(b)));
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return a.localeCompare(b, "zh-Hans-CN", { numeric: true });
}

export function sortSpriteClasses(list: SpriteClassMeta[]): SpriteClassMeta[] {
    return list.sort((a, b) => {
        const an = Number(a.name);
        const bn = Number(b.name);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
        return String(a.name).localeCompare(String(b.name), "zh-Hans-CN", { numeric: true });
    });
}
