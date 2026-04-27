import type { KillPortResult } from "@yinuo-ngm/process";
import { DashboardDocV1, WidgetKey, } from "./dashboard.types";
import { DashboardItemConfig, WidgetMeta } from "./dashboard.widgets";
export interface DashboardService {
    addWidget(projectId: string, widgetKey: WidgetKey, x: number, y: number): Promise<DashboardDocV1>;
    removeWidget(projectId: string, itemId: string): Promise<DashboardDocV1>;
    getOrCreate(projectId: string): Promise<DashboardDocV1>;
    saveWithConflictCheck(projectId: string, incoming: DashboardDocV1): Promise<DashboardDocV1>;
    getAvailableWidgets(projectId: string): Promise<WidgetMeta[]>;
    updateItemConfig(projectId: string, widgetId: string, config: DashboardItemConfig): Promise<DashboardDocV1>;
    killPort(port: number): Promise<KillPortResult>;
}
