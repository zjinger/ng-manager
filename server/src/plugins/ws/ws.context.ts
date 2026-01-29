import type { WsServerMsg, WsTopic } from "@core";
export class WsContext {
    readonly connId: string;
    private subs = new Map<WsTopic, Set<string>>();

    constructor(connId: string, private socket: WebSocket) {
        this.connId = connId;
    }

    send(msg: WsServerMsg) {
        if (this.socket.readyState !== this.socket.OPEN) return;
        this.socket.send(JSON.stringify(msg));
    }

    addSub(topic: WsTopic, key: string) {
        const set = this.subs.get(topic) ?? new Set<string>();
        set.add(key);
        this.subs.set(topic, set);
    }
    delSub(topic: WsTopic, key: string) {
        const set = this.subs.get(topic);
        if (!set) return;
        set.delete(key);
        if (set.size === 0) this.subs.delete(topic);
    }
    hasSub(topic: WsTopic, key: string) {
        return this.subs.get(topic)?.has(key) ?? false;
    }
    clearAll() {
        this.subs.clear();
    }
}
