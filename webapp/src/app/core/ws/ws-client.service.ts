import { inject, Injectable, signal } from "@angular/core";
import { ErrorDispatcher, ErrorPolicyCode } from "../error";
import type { WsClientMsg, WsServerMsg } from "./ws.types";

@Injectable({ providedIn: "root" })
export class WsClientService {
    private ws?: WebSocket;
    private connId = signal<string | null>(null);
    private errorDispatcher = inject(ErrorDispatcher);
    constructor() { }

    connect() {
        if (this.ws) return;

        this.ws = new WebSocket(`ws://${location.host}/ws`);

        this.ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data) as WsServerMsg;
            this.handle(msg);
        };

        this.ws.onerror = () => {
            this.errorDispatcher.dispatch(ErrorPolicyCode.WS_ERROR, "WebSocket 连接异常");
        };

        this.ws.onclose = () => {
            this.ws = undefined;
            this.connId.set(null);
            this.errorDispatcher.dispatch(ErrorPolicyCode.WS_CLOSED, "WebSocket 连接已关闭");
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
            this.errorDispatcher.dispatch(
                msg.code as ErrorPolicyCode,
                msg.message,
                msg.details
            );
            return;
        }
    }
}
