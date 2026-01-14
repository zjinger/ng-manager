export const LS_KEYS = {
    project: {
        currentProjectId: "ngm:project:currentProjectId",
    },
    fs: {
        explorer: {
            lastPath: "ngm:fs:explorer:lastPath",
            favorites: "ngm:fs:explorer:favorites",
        },
    },
    // 未来可加：
    // ui: { sidebarCollapsed: "ngm:ui:sidebarCollapsed" },
    // task: { logPanelHeight: "ngm:task:logPanelHeight" },
} as const;
