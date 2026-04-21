import * as path from "path";

import { ProcessService } from "../domain/process";
import { ProjectServiceImpl } from "../domain/project";
import { TaskServiceImpl } from "../domain/task/task.service.impl";
import type { CoreEventMap } from "../infra/event/events";
import { MemoryEventBus } from "../infra/event/memory-event-bus";
import { RingLogStore } from "../infra/log/ring-log-store";
import { PtyProcessDriver } from "../infra/process";
import type { CoreApp, CreateCoreAppOptions } from "./types";
import { DepsServiceImpl } from "../domain/deps";
import { FsServiceImpl } from "../domain/fs/fs.service.impl";
import { ProjectBootstrapService } from "../domain/project/project-bootstrap.service";
import { Project } from "../domain/project/project.types";
import { CachedNpmRegistry, LatestCacheKv, LatestCacheSnapshot, NodeModulesReader, NpmDriver, NpmRegistryByCli } from "../infra/deps";
import { migrateProjectsIfNeeded, ProjectRepoJsonKv } from "../infra/project";
import { JsonFileKvRepo } from "../infra/storage/json-file-kv.repo";
import { JsonDashboardRepo } from "../infra/dashboard";
import { DashboardServiceImpl } from "../domain/dashboard";
import { ConfigServiceImpl } from "../domain/config";
import { SystemLogServiceImpl } from "../domain/logger";
import { JsonSpriteRepo } from "../infra/sprite";
import { SpriteServiceImpl } from "../domain/sprite";
import { SvnSyncServiceImpl, SvnTaskManager } from "../domain/svn";
import { JsonSvnRuntimeRepo } from "../infra/svn";
import { NodeVersionServiceImpl } from "../domain/node-version/node-version.service.impl";

/**
 * 创建 CoreApp
 * - 本地唯一实例（单用户、单进程假设）
 * - 所有核心能力的装配入口
 */
export async function createCoreApp(
    opts: CreateCoreAppOptions
): Promise<CoreApp> {
    /* ------------------ infra ------------------ */
    // 事件总线（内存）
    const events = new MemoryEventBus<CoreEventMap>();
    // 日志存储（ring buffer）
    const logStore = new RingLogStore(opts.sysLogCapacity ?? 10000);
    const sysLog = new SystemLogServiceImpl(logStore, events, "system");
    // 任务流日志存储（ring buffer）
    const taskStreamLogStore = new RingLogStore(5000);
    // 数据目录
    const dataDir = opts.dataDir // 非 Electron 场景默认落这里
    const cacheDir = path.join(dataDir, "cache");
    /* ------------------ process ------------------ */
    // 进程驱动（Node spawn）
    const processDriver = new PtyProcessDriver();
    // 进程服务（错误包装 + 生命周期抽象）
    const processService = new ProcessService(processDriver);
    /* ------------------ project ------------------ */
    // 底层 KV 文件
    const projectKv = new JsonFileKvRepo<Project>(path.join(dataDir, "projects.kv.json"));
    // 迁移旧 projects.json（如果存在且 KV 为空）
    await migrateProjectsIfNeeded({
        dbDir: dataDir,
        projectKv,
        legacyFileName: "projects.json",
        backup: true,
    });
    //  ProjectRepo 实现
    const projectRepo = new ProjectRepoJsonKv(projectKv);
    const project = new ProjectServiceImpl(projectRepo)

    /* ------------------ node-version ------------------ */
    const nodeVersion = new NodeVersionServiceImpl(sysLog);

    /* ------------------ task ------------------ */
    // 任务服务（start / stop / status）
    const task = new TaskServiceImpl(
        project,
        processService,
        sysLog,
        taskStreamLogStore,
        events,
        nodeVersion
    );

    /* ------------------ bootstrap ------------------ */
    const bootstrap = new ProjectBootstrapService(
        project,
        task,
        events,
        sysLog
    );
    /* ------------------ fs ------------------ */
    const fs = new FsServiceImpl();

    /* ------------------ deps ------------------ */
    // latest cache snapshot 用 KV repo 存在一个文件里

    const latestRepo = new JsonFileKvRepo<LatestCacheSnapshot>(
        path.join(cacheDir, "npm-latest.kv.json")
    );
    // 缓存层(持久化)
    const latestCache = new LatestCacheKv(latestRepo, 'npm-latest', {
        ttlOkMs: 6 * 60 * 60 * 1000,   // 6h
        ttlFailMs: 2 * 60 * 1000,      // 2min
        maxSize: 2000,                 // 2000条目
        flushDebounceMs: 800,          // 0.8s
    });
    // 启动时加载缓存
    await latestCache.load();

    // 定时修剪过期条目
    latestCache.startPruneTimer(
        1 * 60 * 60 * 1000, // 1小时
        (removed) => {
            console.debug(`[deps:latestCache] pruned ${removed} expired entries`);
        }
    );

    // 依赖服务
    const npm = new NpmDriver({ timeoutMs: 120_000 });
    const registryRaw = new NpmRegistryByCli(npm);
    const nodeModules = new NodeModulesReader();
    const registry = new CachedNpmRegistry(registryRaw, latestCache);
    const deps = new DepsServiceImpl(
        project,
        nodeModules,
        registry,
        npm,
        latestCache,
    )

    /* ------------------ dashboard ------------------ */
    const repo = new JsonDashboardRepo(dataDir);
    const dashboard = new DashboardServiceImpl(repo);

    /* ------------------ config ------------------ */
    const config = new ConfigServiceImpl(project);

    /* ------------------ sprite ------------------ */
    const spriteRepo = new JsonSpriteRepo(dataDir);
    const sprite = new SpriteServiceImpl(spriteRepo, project, sysLog, cacheDir, dataDir);

    /* ------------------ svn ------------------ */
    const svnRepo = new JsonSvnRuntimeRepo(path.join(dataDir, "runtime", "svn.runtime.json"));
    const svnTaskManager = new SvnTaskManager();
    const svnSync = new SvnSyncServiceImpl(svnRepo, events, sysLog, svnTaskManager, project);

    /* ------------------ core app ------------------ */
    return {
        events,
        sysLog,
        task,
        project,
        bootstrap,
        fs,
        deps,
        dashboard,
        config,
        sprite,
        svnSync,
        nodeVersion,
        async dispose() {
            // 停止定时器
            latestCache.stopPruneTimer();
            // 强制落盘（把 debounce 没来得及写的写进去）
            await latestCache.flush();
        }
    }
}
