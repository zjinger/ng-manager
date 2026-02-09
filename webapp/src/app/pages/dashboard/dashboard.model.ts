import { GridsterItem } from "angular-gridster2";

export type WidgetKey = "welcome" | "quickTasks" | "killPort" | "newsFeed";

export type QuickTaskWidgetConfig = {
    taskId: string;
    taskName?: string;
    description?: string;
}

export type NewsFeedWidgetConfig = {
    rssUrl: string;
    limit?: number;      // 可选：显示条数
    cacheSec?: number;   // 可选：缓存时间（服务端用）
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

export interface RssFeedItem {
    title: string;
    link: string;
    pubDate?: string;     // ISO string
    author?: string;
    summary?: string;
}

export interface RssFeed {
    title?: string;
    description?: string;
    link?: string;
    items: RssFeedItem[];
    fetchedAt: string; // ISO
}

export interface KillPortResult {
    port: number;
    pids: number[];
    killed: number[];
    failed: { pid: number; reason: string }[];
    note?: string; // 比如提示“可能需要管理员权限”
}