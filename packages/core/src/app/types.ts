
import { ConfigService } from "../domain/config";
import { DashboardService } from "../domain/dashboard";
import { DepsService } from "../domain/deps";
import { FsService } from "../domain/fs";
import { SystemLogService } from "../domain/logger";
import { ProjectBootstrapService, ProjectService } from "../domain/project";
import { TaskService } from "../domain/task";
import type { IEventBus } from "../infra/event/event-bus";
import type { CoreEventMap } from "../infra/event/events";

/**
 * 创建 CoreApp 的参数
 */
export interface CreateCoreAppOptions {
    /** 系统日志最大条数 */
    sysLogCapacity?: number;
    /** 数据目录（存储项目列表等） */
    dataDir: string;
}

/**
 * Core 层对外唯一门面
 * - server / desktop / cli 只能通过它访问核心能力
 */
export interface CoreApp {
    /** 事件总线（状态变化、日志通知） */
    events: IEventBus<CoreEventMap>;

    /** 日志存储（ring buffer） */
    sysLog: SystemLogService;  // 系统日志

    /** 任务执行与管理 */
    task: TaskService;

    /** 项目管理 */
    project: ProjectService;
    bootstrap: ProjectBootstrapService;
    deps: DepsService;
    config: ConfigService;

    /** 文件系统管理 */
    fs: FsService;

    /** 仪表盘管理 */
    dashboard: DashboardService;

    /** 关闭应用/服务前调用，做一些清理工作 */
    dispose(): Promise<void>;

}
