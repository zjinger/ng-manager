
import type { IEventBus, Unsubscribe } from "./event-bus";

/**
 * 内存事件总线：最小可用、可测试、可替换
 * - handler 互相隔离：某个 handler throw 不影响其他
 * - 支持 onAny：便于 debug/埋点
 */
export class MemoryEventBus<EM extends Record<string, any> = Record<string, any>>
    implements IEventBus<EM> {
    private handlers = new Map<string, Set<(payload: any) => void>>();
    private anyHandlers = new Set<(type: string, payload: any) => void>();

    emit<K extends keyof EM & string>(type: K, payload: EM[K]): void {
        // 先通知 onAny
        for (const h of Array.from(this.anyHandlers)) {
            try {
                h(type, payload);
            } catch {
                // swallow: 不让调试/埋点影响主流程
            }
        }

        const set = this.handlers.get(type);
        if (!set || set.size === 0) return;

        // 拷贝一份，避免 handler 内部 off 导致遍历异常
        for (const h of Array.from(set)) {
            try {
                h(payload);
            } catch {
                // swallow: 不让某个订阅者影响其他订阅者
            }
        }
    }

    on<K extends keyof EM & string>(type: K, handler: (payload: EM[K]) => void): Unsubscribe {
        let set = this.handlers.get(type);
        if (!set) {
            set = new Set();
            this.handlers.set(type, set);
        }
        set.add(handler as any);

        return () => {
            const cur = this.handlers.get(type);
            if (!cur) return;
            cur.delete(handler as any);
            if (cur.size === 0) this.handlers.delete(type);
        };
    }

    onAny(handler: (type: string, payload: any) => void): Unsubscribe {
        this.anyHandlers.add(handler);
        return () => this.anyHandlers.delete(handler);
    }
}
