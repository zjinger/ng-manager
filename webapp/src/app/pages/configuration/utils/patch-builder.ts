// webapp/src/app/config/utils/patch-builder.ts
import { getByPath } from "./path";
import { buildConfigPath, PathContext } from "./path-builder";

export interface PatchChange {
    path: string;
    before: any;
    after: any;
}

export interface ConfigPatch {
    scope: "workspace" | "project";
    project?: string;
    target?: string;
    configuration?: string;
    changes: PatchChange[];
}

export function buildConfigPatch(
    baseRaw: any,               // workspace.raw（最近一次 load）
    formValues: Record<string, any>, // UI 当前值（扁平）
    ctx: PathContext
): ConfigPatch {
    const changes: PatchChange[] = [];

    for (const [key, after] of Object.entries(formValues)) {
        const path = buildConfigPath(ctx, key);

        const before = getByPath(baseRaw, path);

        // 核心规则：严格比较，没变就不生成
        if (Object.is(before, after)) {
            continue;
        }

        changes.push({
            path,
            before,
            after,
        });
    }

    return {
        scope: ctx.scope,
        project: ctx.project,
        target: ctx.target,
        configuration: ctx.configuration,
        changes,
    };
}
