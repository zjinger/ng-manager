export interface ApiErrorDto {
    code: string;
    message: string;
    details?: unknown;
}

export interface ApiResponseDto<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiErrorDto;
    requestId?: string;
    version?: string;
}
