
import type { IEventBus } from "../infra/event/event-bus";
import type { CoreEventMap } from "../infra/event/events";
import type { ILogStore } from "../infra/log/log.store";
import type { TaskService } from "../domain/task/task.service";
import { ProjectService } from "../domain/project/project.service";
import { FsService } from "../domain/fs";
import { EditorService } from "../domain/editor";

/**
 * 创建 CoreApp 的参数
 * - 后续可以逐步扩展（dataDir / workspaceDir / storageType 等）
 */
export interface CreateCoreAppOptions {
    /** 任务日志最大条数 */
    taskLogCapacity?: number;
    /** 系统日志最大条数 */
    sysLogCapacity?: number;
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
    taskLog: ILogStore;
    sysLog: ILogStore;

    /** 任务执行与管理 */
    task: TaskService;

    /** 项目管理 */
    project: ProjectService;

    /** 文件系统管理 */
    fs: FsService;

    /** 编辑器集成 */
    editor: EditorService;
}
