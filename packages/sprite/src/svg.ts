import fs from "node:fs";
import path from "node:path";
import type { GenerateSvgGroupOptions, GenerateSvgGroupResult, SvgIconMeta } from "./types";
import { detectGroupType, parseGroupSize, defaultFileSort } from "./detect";

function buildSvgLessHint(prefix: string, group: string) {
    const { width, height, size } = parseGroupSize(group);
    return [
        `.${prefix}-${size} {`,
        `  width: ${width}px;`,
        `  height: ${height}px;`,
        `  display: inline-flex;`,
        `  align-items: center;`,
        `  justify-content: center;`,
        `}`,
        ``,
    ].join("\n");
}

export async function generateSvgGroup(opts: GenerateSvgGroupOptions): Promise<GenerateSvgGroupResult> {
    const { group, groupDir } = opts;

    if (!fs.existsSync(groupDir)) throw new Error(`Icon group not found: ${groupDir}`);

    const type = detectGroupType(groupDir);
    const prefix = opts.prefix || "sl";
    const { size } = parseGroupSize(group);

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

    return {
        mode: "svg",
        group,
        type,
        icons,
        lessText: buildSvgLessHint(prefix, group),
    };
}
