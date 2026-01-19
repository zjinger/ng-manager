export type WidgetKey = "welcome" | "quickTasks" | "killPort" | "newsFeed";

export interface DashboardItem {
    id: string;
    key: WidgetKey;
    title: string;
    desc?: string;
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
    configurable?: boolean; // 是否允许配置
}

export interface DashboardDocV1 {
    version: 1;
    projectId: string;
    updatedAt: number; // ms
    items: DashboardItem[];
}

