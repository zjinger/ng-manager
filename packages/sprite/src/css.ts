import type { GenerateSpriteResult, SpriteCssOptions } from "./types";
import { parseGroupSize } from "./detect";

export function buildLessForSprite(
    r: Pick<GenerateSpriteResult, "group" | "spriteUrl" | "classes">,
    css: SpriteCssOptions = {},
): string {
    const { size, width, height } = parseGroupSize(r.group);
    const prefix = css.prefix || "sl";

    const resolvedUrl = css.spriteUrlResolver
        ? css.spriteUrlResolver({ spriteUrl: r.spriteUrl, group: r.group })
        : r.spriteUrl;

    // base class: .sl-12
    const baseClass = [
        `.${prefix}-${size} {`,
        `  background-image: url("${resolvedUrl}");`,
        `  background-repeat: no-repeat;`,
        `  display: inline-block;`,
        `  width: ${width}px;`,
        `  height: ${height}px;`,
        `}`,
        ``,
    ];

    const lines: string[] = [...baseClass];

    for (const c of r.classes) {
        lines.push(
            `.${c.className} {`,
            `  background-position: -${c.x}px -${c.y}px;`,
            `}`,
            ``,
        );
    }

    return lines.join("\n");
}
