export interface WriteDocRequestDto {
    raw?: string;
    data?: unknown;
}

export interface WriteSchemaRequestDto {
    vm: unknown;
}

export interface DiffSchemaRequestDto {
    vm: unknown;
}