export type ApiMeta = {
    requestId?: string;
    ts: number;
};

export type ApiSuccess<T> = {
    ok: true;
    data: T;
    meta: ApiMeta;
};

export type ApiError = {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    meta: ApiMeta;
};
