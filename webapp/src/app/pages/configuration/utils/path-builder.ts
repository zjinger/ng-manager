// webapp/src/app/config/utils/path-builder.ts
export interface PathContext {
    scope: "workspace" | "project";
    project?: string;
    target?: string;
    configuration?: string;
}

export function buildConfigPath(
    ctx: PathContext,
    key: string
): string {
    if (ctx.scope === "workspace") {
        return key; // e.g. defaultProject
    }

    if (!ctx.project || !ctx.target) {
        throw new Error("project and target are required for project scope");
    }

    let path = `projects.${ctx.project}.architect.${ctx.target}.options.${key}`;

    // 后面支持 configurations
    if (ctx.configuration) {
        path = `projects.${ctx.project}.architect.${ctx.target}.configurations.${ctx.configuration}.${key}`;
    }

    return path;
}
