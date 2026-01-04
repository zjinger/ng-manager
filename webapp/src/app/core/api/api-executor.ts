import { map } from "rxjs";
import type { ApiSuccess, ApiError } from "./api.types";
import { ApiBizError } from "./api-biz-error";

export function unwrapApi<T>() {
    return map((res: ApiSuccess<T> | ApiError) => {
        if (res.ok) {
            return res.data;
        }
        throw new ApiBizError(
            res.error.code,
            res.error.message,
            res.error.details,
            res.meta?.requestId
        );
    });
}
