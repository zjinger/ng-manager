
export type ApiResponseEntity = {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    bodyText: string;
    bodySize: number;
};
