
import type { IEventBus } from "../infra/event/event-bus";
import type { CoreEventMap } from "../infra/event/events";
import type { ILogStore } from "../infra/log/log.store";
import type { TaskService } from "../domain/task/task.service";
import { ProjectService } from "../domain/project/project.service";
import { LoggerService } from "../domain/logger/logger.service";

/**
 * 创建 CoreApp 的参数
 * - 后续可以逐步扩展（dataDir / workspaceDir / storageType 等）
 */
export interface CreateCoreAppOptions {
    /** 内存日志最大条数 */
    logCapacity?: number;
    /** 数据目录（存储项目列表等） */
    dataDir?: string;
}

/**
 * Core 层对外唯一门面
 * - server / desktop / cli 只能通过它访问核心能力
 */
export interface CoreApp {
    /** 事件总线（状态变化、日志通知） */
    events: IEventBus<CoreEventMap>;

    /** 日志存储（ring buffer） */
    log: ILogStore;

    /** 日志服务（封装日志写入与事件通知） */
    logger: LoggerService;

    /** 任务执行与管理 */
    task: TaskService;

    /** 项目管理 */
    project: ProjectService;
}
