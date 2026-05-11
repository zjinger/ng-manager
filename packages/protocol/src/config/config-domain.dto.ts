export interface ConfigWarningDto {
    code: string;
    message: string;
    level?: "info" | "warning" | "error";
}

export interface ConfigFieldOptionDto {
    label: string;
    value: string | number | boolean;
}

export type ConfigFieldTypeDto =
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi-text"
    | "json"
    | "path"
    | "table"
    | "readonly";

export interface ConfigFieldDto {
    key: string;
    label: string;
    type: ConfigFieldTypeDto;
    path: string;
    description?: string;
    placeholder?: string;
    readonly?: boolean;
    options?: ConfigFieldOptionDto[];
    metadata?: Record<string, unknown>;
}

export interface ConfigGroupDto {
    key: string;
    title: string;
    description?: string;
    defaultExpanded?: boolean;
    jsonPath?: string;
    fields: ConfigFieldDto[];
}

export interface ConfigSchemaDto {
    groups: ConfigGroupDto[];
}

export interface ConfigDocumentDto<TViewModel = unknown, TRaw = unknown> {
    id: string;
    type: string;
    title: string;
    projectRoot: string;
    filePath: string;
    raw: TRaw;
    viewModel: TViewModel;
    schema: ConfigSchemaDto;
    readonly?: boolean;
    warnings?: ConfigWarningDto[];
    metadata?: Record<string, unknown>;
}

export type ConfigSchemaItemDto = ConfigFieldDto;
