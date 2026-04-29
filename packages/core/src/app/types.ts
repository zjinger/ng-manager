
import type { ConfigService } from "@yinuo-ngm/config";
import { DashboardService } from "../domain/dashboard";
import type { DepsService } from "@yinuo-ngm/deps";
import { FsService } from "../domain/fs";
import type { SystemLogService } from "@yinuo-ngm/logger";
import { type ProjectService } from "@yinuo-ngm/project";
import type { ProjectBootstrapService } from "@yinuo-ngm/bootstrap";
import type { SpriteService } from "@yinuo-ngm/sprite";
import type { SvnSyncService } from "@yinuo-ngm/svn";
import type { TaskService } from "@yinuo-ngm/task";
import type { NodeVersionService } from "@yinuo-ngm/node-version";
import type { IEventBus } from "@yinuo-ngm/event";
import type { CoreEventMap } from "../infra/event/events";
import type { ProcessService } from "@yinuo-ngm/process";
import type { IProcessDriver } from "@yinuo-ngm/process";

/**
 * 创建 CoreApp 的参数
 */
export interface CreateCoreAppOptions {
    /** 系统日志最大条数 */
    sysLogCapacity?: number;
    /** 数据目录（存储项目列表等） */
    dataDir: string;
    /**
     * 外部注入的 ProcessService
     * - 优先级高于 processDriver
     * - 用于测试或自定义进程管理
     */
    processService?: ProcessService;
    /**
     * 外部注入的 ProcessDriver
     * - 如果未传入 processService，则使用此 driver 创建 ProcessService
     * - 默认使用 PtyProcessDriver
     */
    processDriver?: IProcessDriver;
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

    /** 雪碧图管理 */
    sprite: SpriteService;

    /* SVN 运行时数据管理 */
    svnSync: SvnSyncService

    /* Node 版本管理 */
    nodeVersion: NodeVersionService;

    /** 关闭应用/服务前调用，做一些清理工作 */
    dispose(): Promise<void>;

}
