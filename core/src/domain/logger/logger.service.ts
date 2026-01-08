import type { RingLogStore } from "../../infra/log/ring-log-store";
import type { LogLine, LogLevel, LogSource } from "../../infra/log/types";
import { CoreEventMap, Events } from "../../infra/event/events";
import type { MemoryEventBus } from "../../infra/event/memory-event-bus"; 

export class LoggerService {
    constructor(
        private store: RingLogStore,
        private events: MemoryEventBus<CoreEventMap>
    ) { }

    append(line: LogLine) {
        this.store.append(line);
        this.events.emit(Events.LOG_APPENDED, line);
    }
   
    log(
        level: LogLevel,
        source: LogSource,
        text: string,
        opts?: { refId?: string; data?: any }
    ) {
        const line: LogLine = {
            ts: Date.now(),
            level,
            source,
            refId: opts?.refId,
            text,
            data: opts?.data,
        };
        this.append(line);
        return line;
    }

    tail(limit: number, filter?: { refId?: string; source?: string; level?: string }) {
        return this.store.tail(limit, filter as any);
    }

    clear(filter?: any) {
        return this.store.clear(filter);
    }
}
