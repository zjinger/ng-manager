import {
    HttpErrorResponse,
    HttpInterceptorFn
} from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { ErrorDispatcher, ErrorPolicyCode } from "../error";
import { ApiBizError } from "../api/api-biz-error";

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const dispatcher = inject(ErrorDispatcher);
    // 注入 requestId
    const requestId = crypto.randomUUID();
    req = req.clone({
        setHeaders: { "X-Request-Id": requestId }
    });

    return next(req).pipe(
        catchError((err: unknown) => {
            if (err instanceof ApiBizError) {
                dispatcher.dispatch(err.code as ErrorPolicyCode, err.message, err.details);
                return throwError(() => err);
            }
            if (err instanceof HttpErrorResponse) {
                const code = err.error?.error?.code ?? "HTTP_ERROR" as ErrorPolicyCode;
                dispatcher.dispatch(
                    code,
                    err.message,
                    err.error
                );
                return throwError(() => err);
            }
            dispatcher.dispatch(ErrorPolicyCode.INTERNAL_ERROR);
            return throwError(() => err);
        })
    );
};
