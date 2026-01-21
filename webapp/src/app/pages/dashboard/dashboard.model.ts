import { GridsterItem } from "angular-gridster2";

export type WidgetKey = "welcome" | "quickTasks" | "killPort" | "newsFeed";

export type QuickTaskWidgetConfig = {
    taskId: string;
}

export type NewsFeedWidgetConfig = {
    rssUrl: string;
}

export type DashboardItemConfig = QuickTaskWidgetConfig | NewsFeedWidgetConfig;

export interface DashboardItem extends GridsterItem {
    projectId: string;
    id: string;
    title?: string;
    configurable?: boolean; // 是否允许配置
    desc?: string;
    key: WidgetKey;
    maxItemRows?: number;
    minItemRows?: number;
    maxItemCols?: number;
    minItemCols?: number;
    resizeEnabled?: boolean;
    locked?: boolean;
    config?: DashboardItemConfig;
    icon?: string;
}

export type DashboardDocV1 = {
    version: 1;
    projectId: string;
    updatedAt: number; // ms
    items: DashboardItem[];
}

