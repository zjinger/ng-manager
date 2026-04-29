import * as path from "path";

import { ProcessService, PtyProcessDriver } from "@yinuo-ngm/process";
import type { IProcessDriver } from "@yinuo-ngm/process";
import { MemoryEventBus } from "@yinuo-ngm/event";
import type { CoreEventMap } from "../../infra/event/events";
import { Events } from "../../infra/event";
import { RingLogStore, SystemLogServiceImpl } from "@yinuo-ngm/logger";

export function createInfra(opts: {
    dataDir: string;
    sysLogCapacity?: number;
    processService?: ProcessService;
    processDriver?: IProcessDriver;
}) {
    const events = new MemoryEventBus<CoreEventMap>();
    const logStore = new RingLogStore(opts.sysLogCapacity ?? 10000);
    const sysLog = new SystemLogServiceImpl(
        logStore,
        entry => events.emit(Events.SYSLOG_APPENDED, { entry }),
        "system"
    );
    const taskStreamLogStore = new RingLogStore(5000);
    const dataDir = opts.dataDir;
    const cacheDir = path.join(dataDir, "cache");
    const processService = opts.processService ?? new ProcessService(opts.processDriver ?? new PtyProcessDriver());

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
