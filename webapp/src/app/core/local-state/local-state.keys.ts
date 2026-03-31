export const LS_KEYS = {
    project: {
        currentProjectId: "ngm:project:currentProjectId",
        hubV2PersonalTokenMap: "ngm:project:hubV2PersonalTokenMap",
    },
    fs: {
        explorer: {
            lastPath: "ngm:fs:explorer:lastPath",
            favorites: "ngm:fs:explorer:favorites",
        },
    },
    dashboard: {
        layout: "ngm:dashboard:layout",  // + projectId
    }
    // 未来可加：
    // ui: { sidebarCollapsed: "ngm:ui:sidebarCollapsed" },
    // task: { logPanelHeight: "ngm:task:logPanelHeight" },
} as const;
