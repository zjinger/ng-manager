// src/core/app/core-app.ts

import type { CoreApp, CreateCoreAppOptions } from "./types";

import { MemoryEventBus } from "../infra/event/memory-event-bus";
import type { CoreEventMap } from "../infra/event/events";

import { RingLogStore } from "../infra/log/ring-log-store";

import { NodeProcessDriver } from "../infra/process/node-process.driver";
import { ProcessService } from "../domain/process/process.service";

import { TaskServiceImpl } from "../domain/task/task.service.impl";

/**
 * 创建 CoreApp
 * - 本地唯一实例（单用户、单进程假设）
 * - 所有核心能力的装配入口
 */
export function createCoreApp(
    opts: CreateCoreAppOptions = {}
): CoreApp {
    /* ------------------ infra ------------------ */

    // 事件总线（内存）
    const events = new MemoryEventBus<CoreEventMap>();

    // 日志存储（ring buffer）
    const log = new RingLogStore(opts.logCapacity ?? 2000);

    /* ------------------ process ------------------ */

    // 进程驱动（Node spawn）
    const processDriver = new NodeProcessDriver();

    // 进程服务（错误包装 + 生命周期抽象）
    const processService = new ProcessService(processDriver);

    /* ------------------ task ------------------ */

    // 任务服务（start / stop / status）
    const task = new TaskServiceImpl(
        processService,
        log,
        events
    );

    /* ------------------ core app ------------------ */

    return {
        events,
        log,
        task,
    };
}
