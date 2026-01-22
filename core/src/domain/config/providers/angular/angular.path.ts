/**
 * Angular workspace 中 project 节点可能使用 architect（老）或 targets（新）
 * 这里统一封装，避免散落在 mapper/patch 等逻辑里
 */
export function pickArchitectKey(projectNode: any): "architect" | "targets" {
    return projectNode?.architect ? "architect" : "targets";
}