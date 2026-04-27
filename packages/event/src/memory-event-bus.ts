import type { IEventBus, Unsubscribe } from "./event-bus";

export class MemoryEventBus<EM extends Record<string, any> = Record<string, any>>
    implements IEventBus<EM> {
    private handlers = new Map<string, Set<(payload: any) => void>>();
    private anyHandlers = new Set<(type: string, payload: any) => void>();

    emit<K extends keyof EM & string>(type: K, payload: EM[K]): void {
        for (const h of Array.from(this.anyHandlers)) {
            try {
                h(type as string, payload);
            } catch {
                // swallow
            }
        }

        const set = this.handlers.get(type as string);
        if (!set || set.size === 0) return;

        for (const h of Array.from(set)) {
            try {
                h(payload);
            } catch {
                // swallow
            }
        }
    }

    on<K extends keyof EM & string>(
        type: K,
        handler: (payload: EM[K]) => void
    ): Unsubscribe {
        let set = this.handlers.get(type as string);
        if (!set) {
            set = new Set();
            this.handlers.set(type as string, set);
        }
        set.add(handler as (payload: any) => void);

        return () => {
            const cur = this.handlers.get(type as string);
            if (!cur) return;
            cur.delete(handler as (payload: any) => void);
            if (cur.size === 0) this.handlers.delete(type as string);
        };
    }

    onAny(handler: (type: string, payload: any) => void): Unsubscribe {
        this.anyHandlers.add(handler);
        return () => this.anyHandlers.delete(handler);
    }
}
