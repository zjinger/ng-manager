// src/app/core-app.ts
import * as path from "path";
import * as os from "os";

import type { CoreEventMap } from "../infra/event/events";
import type { CoreApp, CreateCoreAppOptions } from "./types";
import { MemoryEventBus } from "../infra/event/memory-event-bus";
import { RingLogStore } from "../infra/log/ring-log-store";
import { NodeProcessDriver } from "../infra/process";
import { ProcessService } from "../domain/process";
import { EditorServiceImpl } from "../domain/editor";
import { ProjectServiceImpl } from "../domain/project";
import { TaskServiceImpl } from "../domain/task/task.service.impl";
import { JsonProjectRepo } from "../infra/storage/project.repo.json";
import { FsServiceImpl } from "../domain/fs/fs.service.impl";

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
    const taskLog = new RingLogStore(opts.taskLogCapacity ?? 8000);
    const sysLog = new RingLogStore(opts.sysLogCapacity ?? 2000);


    /* ------------------ process ------------------ */
    // 进程驱动（Node spawn）
    const processDriver = new NodeProcessDriver();
    // 进程服务（错误包装 + 生命周期抽象）
    const processService = new ProcessService(processDriver);
    /* ------------------ editor ------------------ */
    const editor = new EditorServiceImpl(processService);
    /* ------------------ project ------------------ */
    const dataDir =
        opts.dataDir ??
        path.join(os.homedir(), ".ng-manager"); // 非 Electron 场景默认落这里
    const projectRepo = new JsonProjectRepo(dataDir);
    const project = new ProjectServiceImpl(
        projectRepo,
        editor
    )

    /* ------------------ task ------------------ */
    // 任务服务（start / stop / status）
    const task = new TaskServiceImpl(
        project,
        processService,
        sysLog,
        taskLog,
        events
    );
    /* ------------------ fs ------------------ */
    const fs = new FsServiceImpl();
    /* ------------------ core app ------------------ */
    return {
        events,
        taskLog,
        sysLog,
        task,
        project,
        fs,
        editor
    };
}
