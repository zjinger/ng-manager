import { WsClientMsg, WsServerMsg, WsTopic } from "@core/protocol";
import { WsContext } from "./ws.context";
import { ErrorCode } from "@core";

export type TopicHandler = {
    topic: WsTopic;
    sub(ctx: WsContext, msg: Extract<WsClientMsg, { op: "sub" }>): Promise<void> | void;
    unsub(ctx: WsContext, msg: Extract<WsClientMsg, { op: "unsub" }>): Promise<void> | void;

    resize?(ctx: WsContext, msg: Extract<WsClientMsg, { op: "resize" }>): Promise<void> | void;
};

export class WsRouter {
    private handlers = new Map<WsTopic, TopicHandler>();

    register(handler: TopicHandler) {
        this.handlers.set(handler.topic, handler);
    }

    handleRaw(ctx: WsContext, raw: any) {
        let msg: WsClientMsg | null = null;
        // console.log("[ws] recv", ctx.connId, raw);
        try {
            const text = typeof raw === "string" ? raw : raw?.toString?.() ?? "";
            msg = JSON.parse(text);
        } catch {
            ctx.send(this.err("BAD_JSON", "Invalid JSON"));
            return;
        }

        if (!msg || typeof msg !== "object" || !("op" in msg)) {
            ctx.send(this.err("BAD_MSG", "Invalid message"));
            return;
        }

        if (msg.op === "ping") {
            ctx.send({ op: "pong", ts: Date.now() });
            return;
        }

        // resize
        if (msg.op === "resize") {
            const topic = (msg as Extract<WsClientMsg, { op: "resize" }>).topic as WsTopic;
            const h = this.handlers.get(topic);
            if (!h || !h.resize) {
                ctx.send(this.err("OP_NOT_SUPPORTED", `resize not supported on topic: ${String(topic)}`, { topic }));
                return;
            }
            try {
                return void h.resize(ctx, msg as any);
            } catch (e: any) {
                ctx.send(this.err("HANDLER_FAILED", e?.message ?? "handler failed", { topic, op: msg.op }));
                return;
            }
        }


        if (msg.op === "sub" || msg.op === "unsub") {
            const topic = (msg as Extract<WsClientMsg, { op: "sub" | "unsub" }>).topic as WsTopic;
            const h = this.handlers.get(topic);
            if (!h) {
                ctx.send(this.err("TOPIC_NOT_FOUND", `Unknown topic: ${String(topic)}`, { topic }));
                return;
            }
            try {
                if (msg.op === "sub") return void h.sub(ctx, msg as any);
                return void h.unsub(ctx, msg as any);
            } catch (e: any) {
                ctx.send(this.err("HANDLER_FAILED", e?.message ?? "handler failed", { topic, op: msg.op }));
            }
            return;
        }

        ctx.send(this.err("OP_NOT_FOUND", `Unknown op: ${(msg as any).op}`));
    }

    private err(code: ErrorCode, message: string, details?: any): WsServerMsg {
        return { op: "error", code, message, details, ts: Date.now() };
    }
}