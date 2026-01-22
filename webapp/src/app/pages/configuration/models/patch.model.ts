// Patch 模型（简单可控，后续考虑 RFC6902）
// - path：dot-path（a.b.c），暂不支持数组（如 a.b[0].c）
export interface ConfigPatch {
    scope: "workspace" | "project";
    project?: string;
    target?: string;
    configuration?: string;

    changes: Array<{
        path: string;
        before: any;
        after: any;
    }>;
}

export type PatchConflictDetail = {
    path: string;
    expectedBefore: any;
    actualCurrent: any;
};