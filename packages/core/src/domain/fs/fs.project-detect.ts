import * as path from "node:path";
import { promises as fsp } from "node:fs";
import { statSafe } from "./fs.path";
import type { ProjectKind } from "./fs.types";

async function existsFile(p: string) {
    try {
        await fsp.access(p);
        return true;
    } catch {
        return false;
    }
}

export async function detectProjectKind(dir: string): Promise<{ kind: ProjectKind; hints: string[] } | null> {
    const st = await statSafe(dir);
    if (!st || !st.isDirectory()) return null;

    const hints: string[] = [];
    const hasAngularJson = await existsFile(path.join(dir, "angular.json"));
    if (hasAngularJson) hints.push("angular.json");

    const hasVueCli = await existsFile(path.join(dir, "vue.config.js"));
    if (hasVueCli) hints.push("vue.config.js");

    const hasVite =
        (await existsFile(path.join(dir, "vite.config.ts"))) ||
        (await existsFile(path.join(dir, "vite.config.js"))) ||
        (await existsFile(path.join(dir, "vite.config.mts"))) ||
        (await existsFile(path.join(dir, "vite.config.mjs")));
    if (hasVite) hints.push("vite.config.*");

    const hasPkg = await existsFile(path.join(dir, "package.json"));
    if (hasPkg) hints.push("package.json");

    if (!hasPkg && hints.length === 0) return null;

    let deps: Record<string, any> = {};
    if (hasPkg) {
        try {
            const txt = await fsp.readFile(path.join(dir, "package.json"), "utf-8");
            const pkg = JSON.parse(txt);
            deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
        } catch {
            // ignore
        }
    }

    const has = (name: string) => !!deps?.[name];

    if (hasAngularJson || has("@angular/core")) return { kind: "angular", hints: ["angular"] };
    if (hasVueCli || has("vue")) return { kind: "vue", hints: ["vue", ...(hasVite ? ["vite"] : [])] };
    if (has("react")) return { kind: "react", hints: ["react", ...(hasVite ? ["vite"] : [])] };
    if (hasPkg) return { kind: "node", hints: ["node"] };

    return { kind: "unknown", hints };
}
