import { DashboardDocV1, WidgetKey, } from "./dashboard.types";
import { DashboardService } from "./dashboard.service";
import { defaultDashboard } from "./dashboard.defaults";
import { AppError } from "../../common/errors";
import { DashboardRepo } from "./dashboard.repo";
import { DashboardItemConfig, makeWidgetItem, WidgetMeta, WIDGETS } from "./dashboard.widgets";
import { killPort, KillPortResult } from "../../infra/process";

export class DashboardServiceImpl implements DashboardService {
    constructor(private repo: DashboardRepo) { }

    async getOrCreate(projectId: string): Promise<DashboardDocV1> {
        const doc = await this.repo.load(projectId);
        if (doc) return doc;

        const created = defaultDashboard(projectId);
        await this.repo.save(projectId, created);
        return created;
    }

    /**
     * 保存（带简单冲突检测）
     * - clientUpdatedAt < serverUpdatedAt => 冲突（抛错给上层转 409）
     */
    async saveWithConflictCheck(projectId: string, incoming: DashboardDocV1): Promise<DashboardDocV1> {
        const current = await this.repo.load(projectId);
        if (current && incoming.updatedAt < current.updatedAt) {
            throw new AppError("DASHBOARD_CONFLICT", "dashboard updated elsewhere", {
                serverUpdatedAt: current.updatedAt,
            });
        }

        const next: DashboardDocV1 = {
            ...incoming,
            projectId,
            version: 1,
            updatedAt: Date.now(),
        };

        await this.repo.save(projectId, next);
        return next;
    }

    async addWidget(projectId: string, widgetKey: WidgetKey, x: number, y: number): Promise<DashboardDocV1> {
        const doc = await this.getOrCreate(projectId);
        const meta = WIDGETS[widgetKey];
        if (!meta) throw new AppError("WIDGET_NOT_FOUND", "unknown widget", { widgetKey });

        // singleton：只允许一个
        if (meta.singleton) {
            const existed = doc.items.find(it => it.key === widgetKey);
            if (existed) return doc; // 幂等：已存在就不重复加
        }

        const newItem = makeWidgetItem(projectId, meta);

        // 找一个空位
        // const pos = findFirstFit(doc.items, newItem, 12);
        // newItem.x = pos.x;
        // newItem.y = pos.y;
        newItem.x = x;
        newItem.y = y;
        const next: DashboardDocV1 = {
            ...doc,
            items: [...doc.items, newItem],
            updatedAt: Date.now(),
        };

        await this.repo.save(projectId, next);
        return next;
    }

    async removeWidget(projectId: string, itemId: string): Promise<DashboardDocV1> {
        const doc = await this.getOrCreate(projectId);

        const target = doc.items.find(it => it.id === itemId);
        if (!target) return doc; // 幂等：没有就当成功

        if (target.locked) {
            throw new AppError("WIDGET_LOCKED", "widget is locked", { itemId, key: target.key });
        }

        const nextItems = doc.items.filter(it => it.id !== itemId);

        const next: DashboardDocV1 = {
            ...doc,
            items: nextItems,
            updatedAt: Date.now(),
        };

        await this.repo.save(projectId, next);
        return next;
    }

    /**
     * 获取所有可用的 widget 规格信息
     */
    async getAvailableWidgets(projectId: string): Promise<WidgetMeta[]> {
        const doc = await this.getOrCreate(projectId);
        const availableWidgets: WidgetMeta[] = [];
        for (const [key, meta] of Object.entries(WIDGETS) as [WidgetKey, WidgetMeta][]) {
            // singleton 且已存在的，不再列出
            if (meta.singleton) {
                const existed = doc.items.find(it => it.key === key);
                if (existed) continue;
            }
            availableWidgets.push(meta);
        }
        return availableWidgets;
    }

    async updateItemConfig(projectId: string, widgetId: string, config: DashboardItemConfig): Promise<DashboardDocV1> {
        const doc = await this.getOrCreate(projectId);
        const itemIndex = doc.items.findIndex(it => it.id === widgetId);
        if (itemIndex === -1) {
            throw new AppError("WIDGET_NOT_FOUND", "widget not found", { widgetId });
        }
        const item = doc.items[itemIndex];
        const updatedItem: typeof item = {
            ...item,
            config: config as Record<string, any>,
        };
        const nextItems = [...doc.items];
        nextItems[itemIndex] = updatedItem;
        const next: DashboardDocV1 = {
            ...doc,
            items: nextItems,
            updatedAt: Date.now(),
        };
        await this.repo.save(projectId, next);
        return next;
    }

    /**
     * 杀掉占用端口的进程
     *  -（MVP：只 kill LISTEN 的占用者；Windows 用 netstat，Unix 用 lsof/ss/netstat）
     */
    async killPort(port: number): Promise<KillPortResult> {
        return await killPort(port);

    }
}