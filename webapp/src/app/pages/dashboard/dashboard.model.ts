
export type WidgetKey = "welcome" | "quickTasks" | "killPort" | "newsFeed";

export type DashboardItem = {
    id: string;
    title?: string;
    configurable?: boolean; // 是否允许配置
    desc?: string;
    key: WidgetKey;
    x: number;
    y: number;
    cols: number;
    rows: number;
    maxItemRows?: number;
    minItemRows?: number;
    maxItemCols?: number;
    minItemCols?: number;
    resizeEnabled?: boolean;
    locked?: boolean;
    config?: Record<string, any>;

    icon?: string;
}

export type DashboardDocV1 = {
    version: 1;
    projectId: string;
    updatedAt: number; // ms
    items: DashboardItem[];
}

