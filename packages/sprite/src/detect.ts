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

/** parse "10-10" => tile size 10x10; "12-16" => 12 (use w||h for size naming) */
export function parseGroupSize(group: string) {
    const [w, h] = group.split("-").map((n) => Number(n) || 0);
    const size = w || h || 0;
    const width = size;
    const height = size;
    return { size, width, height };
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
