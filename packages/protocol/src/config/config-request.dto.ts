export interface ConfigPatchDto {
    op: "set" | "remove" | "append" | "merge";
    path: string;
    value?: unknown;
}

export interface ConfigWriteRequestDto {
    type: string;
    filePath: string;
    patches: ConfigPatchDto[];
}

export interface ConfigPreviewRequestDto {
    type: string;
    filePath: string;
    patches: ConfigPatchDto[];
}

export interface ConfigOpenInEditorRequestDto {
    filePath: string;
}
