export interface ConfigProviderItemDto {
    type: string;
    title: string;
    description?: string;
}

export interface ConfigDetectResultDto {
    type: string;
    title: string;
    available: boolean;
    filePaths: string[];
    reason?: string;
    metadata?: Record<string, unknown>;
}

export type ResolvedDomainDto = ConfigDetectResultDto;
