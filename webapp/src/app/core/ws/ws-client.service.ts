import { Injectable, signal } from "@angular/core";
import { UiNotifierService } from "../ui-notifier.service";
import type { WsServerMsg, WsClientMsg } from "./ws.types";

@Injectable({ providedIn: "root" })
export class WsClientService {
    private ws?: WebSocket;
    private connId = signal<string | null>(null);

    constructor(private ui: UiNotifierService) { }

    connect() {
        if (this.ws) return;

        this.ws = new WebSocket(`ws://${location.host}/ws`);

        this.ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data) as WsServerMsg;
            this.handle(msg);
        };

        this.ws.onerror = () => {
            this.ui.error("WebSocket 连接异常");
        };

        this.ws.onclose = () => {
            this.ws = undefined;
            this.connId.set(null);
            this.ui.warn("WebSocket 已断开");
        };
    }

    send(msg: WsClientMsg) {
        this.ws?.send(JSON.stringify(msg));
    }

    private handle(msg: WsServerMsg) {
        if (msg.op === "hello") {
            this.connId.set(msg.connId);
            return;
        }

        if (msg.op === "error") {
            this.ui.error(msg.message, { code: msg.code });
            return;
        }

        // 其他消息交给上层（后面扩展）
    }
}
