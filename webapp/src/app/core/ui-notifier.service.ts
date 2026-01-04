import { Injectable } from "@angular/core";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzModalService } from "ng-zorro-antd/modal";

@Injectable({ providedIn: "root" })
export class UiNotifierService {
    constructor(private msg: NzMessageService, private modalService: NzModalService) { }

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

    modal(text: string, action?: any) {
        this.modalService.error({
            nzTitle: '错误',
            nzContent: text,
            nzOnOk: () => {
                if (action?.reload) {
                    window.location.reload();
                } else if (action?.redirect) {
                    window.location.href = action.redirect;
                }
            }
        });
    }

    banner(text: string, action?: any) {
        
    }
}
