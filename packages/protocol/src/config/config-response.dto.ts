import type { ConfigWarningDto } from "./config-domain.dto";
import type { ConfigPatchDto } from "./config-request.dto";

export interface ConfigOpenInEditorResponseDto {
    filePath: string;
}

export interface ConfigPreviewResultDto {
    type: string;
    filePath: string;
    before: unknown;
    after: unknown;
    patches: ConfigPatchDto[];
    warnings?: ConfigWarningDto[];
}

export interface ConfigWriteResultDto {
    type: string;
    filePath: string;
    changed: boolean;
    backupPath?: string;
    warnings?: ConfigWarningDto[];
}
