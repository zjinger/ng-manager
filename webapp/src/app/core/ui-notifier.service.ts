import { Injectable } from "@angular/core";
import { NzMessageService } from "ng-zorro-antd/message";

@Injectable({ providedIn: "root" })
export class UiNotifierService {
    constructor(private msg: NzMessageService) { }

    error(text: string, meta?: any) {
        this.msg.error(text);
        console.error("[UI ERROR]", text, meta);
    }

    warn(text: string) {
        this.msg.warning(text);
    }

    info(text: string) {
        this.msg.info(text);
    }
}
