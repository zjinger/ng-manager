import * as fs from "fs";
import { CoreError, CoreErrorCodes } from "../../common/errors";
import type { ProjectMeta } from "./project.meta";
import { analyzeAngularJson } from "./analyzers/angular.analyzer";

export type ProjectHydrateAspect = "angular" | "vite";

/**
 * ProjectInspector
 * - 按需补齐 ProjectMeta 的 snapshot（保持 scanProject 轻量）
 */
export class ProjectInspector {
    hydrate(meta: ProjectMeta, aspects: ProjectHydrateAspect[]): ProjectMeta {
        const next: ProjectMeta = { ...meta };

        for (const a of aspects) {
            if (a === "angular") {
                next.angular = this.hydrateAngular(next.angular);
            } else if (a === "vite") {
                next.vite = this.hydrateVite(next.vite);
            }
        }

        return next;
    }

    private hydrateAngular(angular: ProjectMeta["angular"]): ProjectMeta["angular"] {
        if (!angular?.found?.angularJsonPath) return angular;

        const angularJsonPath = angular.found.angularJsonPath;
        const snapshot = analyzeAngularJson(angularJsonPath);

        return {
            ...angular,
            snapshot,
            hydratedAt: Date.now(),
        };
    }

    private hydrateVite(vite: ProjectMeta["vite"]): ProjectMeta["vite"] {
        if (!vite?.found?.configPath) return vite;

        const configPath = vite.found.configPath;
        if (!fs.existsSync(configPath)) {
            throw new CoreError(CoreErrorCodes.PROJECT_VUE_CONFIG_NOT_FOUND, `vite config not found: ${configPath}`, { path: configPath });
        }

        // MVP：只判定 static/dynamic/unknown（不 eval，不 AST）
        const raw = fs.readFileSync(configPath, "utf-8");
        const mode = detectViteMode(raw);

        // 可选：非常保守的字段抽取（抽不到就算了）
        const snapshot: NonNullable<ProjectMeta["vite"]>["snapshot"] = {
            mode,
            ...tryExtractViteBasics(raw),
        };

        return {
            ...vite,
            snapshot,
            hydratedAt: Date.now(),
        };
    }
}

/** 保守判定：只要存在明显“函数/条件/变量主导”就认为 dynamic */
function detectViteMode(raw: string): "static" | "dynamic" | "unknown" {
    const hasDefineConfig = /defineConfig\s*\(/.test(raw);
    const hasObjectLiteral = /defineConfig\s*\(\s*\{/.test(raw) || /export\s+default\s*\{/.test(raw);

    // 动态特征（非常粗略，但够 MVP）
    const hasFunctionExport =
        /export\s+default\s*\(/.test(raw) ||
        /defineConfig\s*\(\s*\(/.test(raw) ||
        /defineConfig\s*\(\s*async\s*\(/.test(raw);

    const hasProcessEnv = /process\.env|import\.meta\.env/.test(raw);
    const hasIf = /\bif\s*\(|\?\s*.*:/.test(raw);

    if (!hasDefineConfig && !/vite/i.test(raw)) return "unknown";
    if (hasFunctionExport) return "dynamic";
    if (hasProcessEnv || hasIf) return "dynamic";
    if (hasObjectLiteral) return "static";
    return "unknown";
}

/**
 * 非 AST 的超保守抽取：仅限极常见写法
 * defineConfig({ base: "...", build: { outDir: "..." }, server:{ port: 3000 } })
 * 抽不到就返回 {}
 */
function tryExtractViteBasics(raw: string): Partial<NonNullable<ProjectMeta["vite"]>["snapshot"]> {
    const out: any = {};

    // base: '...'
    const baseMatch = raw.match(/\bbase\s*:\s*['"`]([^'"`]+)['"`]/);
    if (baseMatch?.[1]) out.base = baseMatch[1];

    // build.outDir
    const outDirMatch = raw.match(/\boutDir\s*:\s*['"`]([^'"`]+)['"`]/);
    if (outDirMatch?.[1]) out.build = { ...(out.build ?? {}), outDir: outDirMatch[1] };

    // build.sourcemap: true/false
    const smMatch = raw.match(/\bsourcemap\s*:\s*(true|false)/);
    if (smMatch?.[1]) out.build = { ...(out.build ?? {}), sourcemap: smMatch[1] === "true" };

    // server.port: 5173
    const portMatch = raw.match(/\bport\s*:\s*(\d{2,5})/);
    if (portMatch?.[1]) out.server = { ...(out.server ?? {}), port: Number(portMatch[1]) };

    return out;
}
