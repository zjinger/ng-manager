import {
    HttpErrorResponse,
    HttpInterceptorFn
} from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { UiNotifierService } from "../ui-notifier.service";

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const ui = inject(UiNotifierService);

    // 注入 requestId
    const requestId = crypto.randomUUID();
    req = req.clone({
        setHeaders: { "X-Request-Id": requestId }
    });

    return next(req).pipe(
        catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse) {
                const body: any = err.error;
                const code = body?.error?.code ?? "HTTP_ERROR";
                const message =
                    body?.error?.message ??
                    (err.status === 0
                        ? "无法连接本地服务"
                        : `请求失败 (${err.status})`);

                // 统一 UI 策略
                ui.error(message, { code, requestId });

                return throwError(() => ({
                    source: "http",
                    code,
                    message,
                    status: err.status,
                    details: body?.error?.details,
                    requestId: body?.meta?.requestId ?? requestId,
                }));
            }

            ui.error("未知异常");
            return throwError(() => err);
        })
    );
};
