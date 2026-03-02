import type { SpriteConfig } from "./sprite.types";
import type { SpriteClassMeta } from "@yinuo-ngm/sprite";

export type RenderTemplateCtx = {
    group: string;               // e.g. "12" or "12-12"
    item: SpriteClassMeta;       // name/className/x/y/width/height
};

function escapeAttr(v: string) {
    // 仅用于防止模板里插值破坏属性
    return String(v ?? "").replace(/"/g, "&quot;");
}

export function renderSpriteTemplate(cfg: SpriteConfig, ctx: RenderTemplateCtx): string {
    const tpl = String(cfg.template ?? "").trim() || `<i class="{base} {class}"></i>`;

    const className = String(ctx.item.className ?? "").trim(); // e.g. "sl-16-home"
    const name = String(ctx.item.name ?? "").trim();           // e.g. "home"
    const group = String(ctx.group ?? "").trim();

    // base / size 推导：优先从 className 里取 `${prefix}-${size}`，更稳定
    const prefix = String(cfg.prefix ?? "sl").trim() || "sl";
    let size = "";
    let base = "";

    // className 约定：${prefix}-${size}-${name}
    // 比如 sl-16-home => size=16, base=sl-16
    const parts = className.split("-");
    if (parts.length >= 3 && parts[0] === prefix) {
        size = parts[1];
        base = `${prefix}-${size}`;
    } else {
        // fallback：从 group 推导 size（取 group 第一段）
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

    // 替换 {var}
    return tpl.replace(/\{(\w+)\}/g, (_, k: string) => escapeAttr(vars[k] ?? ""));
}