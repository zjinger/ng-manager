import { Injectable, inject } from "@angular/core";
import { ERROR_POLICY, ErrorPolicyCode } from "./error-policy";
import { UiNotifierService } from "../ui-notifier.service";
import { APP_CONFIG } from "@env/environment";

@Injectable({ providedIn: "root" })
export class ErrorDispatcher {
    private ui = inject(UiNotifierService);

    dispatch(code: ErrorPolicyCode, message?: string, ctx?: any) {
        const policy = ERROR_POLICY[code];

        // fallback
        if (!policy) {
            this.ui.error(message ?? "未知错误");
            return;
        }

        const finalMessage =
            typeof policy.message === "function"
                ? policy.message(ctx)
                : policy.message ?? message;

        switch (policy.level) {
            case "silent":
                return;

            case "toast":
                this.ui.error(finalMessage ?? "操作失败");
                return;

            case "banner":
                this.ui.banner?.(finalMessage ?? "系统异常", policy.action);
                return;

            case "modal":
                this.ui.modal?.(finalMessage ?? "操作异常", policy.action);
                return;

            case "dev-only":
                if (!APP_CONFIG.production) {
                    console.warn("[DEV ERROR]", code, ctx);
                }
                return;
        }
    }
}
