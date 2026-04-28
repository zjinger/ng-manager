import type { SpriteConfig } from "./sprite.types";
import type { SpriteClassMeta } from "../types";

export type RenderTemplateCtx = {
    group: string;
    item: SpriteClassMeta;
};

function escapeAttr(v: string) {
    return String(v ?? "").replace(/"/g, "&quot;");
}

export function renderSpriteTemplate(cfg: SpriteConfig, ctx: RenderTemplateCtx): string {
    const tpl = String(cfg.template ?? "").trim() || `<i class="{base} {class}"></i>`;

    const className = String(ctx.item.className ?? "").trim();
    const name = String(ctx.item.name ?? "").trim();
    const group = String(ctx.group ?? "").trim();

    const prefix = String(cfg.prefix ?? "sl").trim() || "sl";
    let size = "";
    let base = "";

    const parts = className.split("-");
    if (parts.length >= 3 && parts[0] === prefix) {
        size = parts[1];
        base = `${prefix}-${size}`;
    } else {
        size = group.split("-")[0] || "";
        base = size ? `${prefix}-${size}` : prefix;
    }

    const vars: Record<string, string> = {
        base,
        class: className,
        name,
        size,
        group,
    };

    return tpl.replace(/\{(\w+)\}/g, (_, k: string) => escapeAttr(vars[k] ?? ""));
}
