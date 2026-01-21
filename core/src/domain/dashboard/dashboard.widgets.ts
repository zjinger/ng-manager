import { uid } from "../../common/id";
import type { DashboardItem, WidgetKey } from "./dashboard.types";

export type QuickTaskWidgetConfig = {
    taskId: string;
}

export type NewsFeedWidgetConfig = {
    rssUrl: string;
}

export type DashboardItemConfig = QuickTaskWidgetConfig | NewsFeedWidgetConfig;

export type WidgetMeta = {
    key: WidgetKey;
    title: string;
    desc: string;
    cols: number;
    rows: number;
    singleton?: boolean; // 是否只允许一个
    locked?: boolean;    // 是否默认锁定（不允许删除）
    defaultConfig?: DashboardItemConfig;
    icon?: string;
    resizeEnabled?: boolean;
    configurable?: boolean; // 是否允许配置
};

export const DEFAULT_FIXED_COLS_WIDTH = 100; // px
export const DEFAULT_FIXED_ROWS_HEIGHT = 100; // px

export const WIDGETS: Record<WidgetKey, WidgetMeta> = {
    welcome: { key: "welcome", title: "欢迎", desc: '快速上手tips', cols: 6, rows: 8, singleton: true, resizeEnabled: false, icon: 'smile' },
    quickTasks: { key: "quickTasks", title: "运行任务", desc: '快速运行任务', cols: 4, rows: 2, icon: 'rocket', resizeEnabled: false, configurable: true, },
    killPort: { key: "killPort", title: "终止端口", desc: '终止占用指定端口的进程', cols: 4, rows: 2, singleton: true, icon: 'thunderbolt', resizeEnabled: false },
    newsFeed: { key: "newsFeed", title: "订阅", desc: '订阅新闻源', cols: 4, rows: 6, icon: 'read', resizeEnabled: true, defaultConfig: { rssUrl: "https://hnrss.org/frontpage" } },
};

export function makeWidgetItem(projectId: string, meta: WidgetMeta): DashboardItem {
    const id = uid("dashboard");
    return {
        projectId,
        id,
        key: meta.key,
        title: meta.title,
        x: 0,
        y: 0,
        cols: meta.cols,
        rows: meta.rows,
        locked: meta.locked,
        config: meta.defaultConfig ? { ...meta.defaultConfig } : undefined,
        resizeEnabled: meta.resizeEnabled === true,
        icon: meta.icon,
        configurable: meta.configurable === true,
    }
}