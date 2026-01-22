/**
 * Angular workspace 中 project 节点可能使用 architect（老）或 targets（新）
 * 这里统一封装，避免散落在 mapper/patch 等逻辑里
 */
export function pickArchitectKey(projectNode: any): "architect" | "targets" {
    // Angular 新版偏向 targets，但老结构也可能是 architect
    if (projectNode?.targets && typeof projectNode.targets === "object") {
        return "targets";
    }
    if (projectNode?.architect && typeof projectNode.architect === "object") {
        return "architect";
    }
    // fallback：用 targets（也可以抛错）
    return "targets";
}