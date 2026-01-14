import { inject, Injectable } from "@angular/core";
import { NzMessageService } from "ng-zorro-antd/message";
// import { NzModalService } from "ng-zorro-antd/modal";

@Injectable({ providedIn: "root" })
export class UiNotifierService {
    // private modalService: NzModalService = inject(NzModalService);
    private msg: NzMessageService = inject(NzMessageService);
    error(text: string, meta?: any) {
        this.msg.error(text);
    }

    warn(text: string) {
        this.msg.warning(text);
    }

    info(text: string) {
        this.msg.info(text);
    }

    success(text: string) {
        this.msg.success(text);
    }

    // modal(text: string, action?: any) {
    //     this.modalService.error({
    //         nzTitle: '错误',
    //         nzContent: text,
    //         nzOnOk: () => {
    //             if (action?.reload) {
    //                 window.location.reload();
    //             } else if (action?.redirect) {
    //                 window.location.href = action.redirect;
    //             }
    //         }
    //     });
    // }

    banner(text: string, action?: any) {

    }


    // 系统提示
    totast(text: string, action?: any) {

    }
}
