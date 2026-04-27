import * as path from "path";

import { ProcessService, PtyProcessDriver } from "@yinuo-ngm/process";
import type { CoreEventMap } from "../../infra/event/events";
import { MemoryEventBus } from "../../infra/event/memory-event-bus";
import { RingLogStore } from "../../infra/log/ring-log-store";
import { SystemLogServiceImpl } from "../../domain/logger";

export function createInfra(opts: {
    dataDir: string;
    sysLogCapacity?: number;
}) {
    const events = new MemoryEventBus<CoreEventMap>();
    const logStore = new RingLogStore(opts.sysLogCapacity ?? 10000);
    const sysLog = new SystemLogServiceImpl(logStore, events, "system");
    const taskStreamLogStore = new RingLogStore(5000);
    const dataDir = opts.dataDir;
    const cacheDir = path.join(dataDir, "cache");
    const processDriver = new PtyProcessDriver();
    const processService = new ProcessService(processDriver);

    return {
        events,
        sysLog,
        taskStreamLogStore,
        dataDir,
        cacheDir,
        processService,
    };
}

export type CoreInfra = ReturnType<typeof createInfra>;
