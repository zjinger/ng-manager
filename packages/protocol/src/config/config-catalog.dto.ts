export type ConfigCodec = "json" | "jsonc" | "yaml" | "raw";

export type ConfigDocKind = "angular" | "tsconfig" | "eslint" | "prettier" | "raw";

export type ConfigDocPolicy = "single" | "mergeTsconfigExtends";

export type MissingPolicy = "hide" | "showAsCreate" | "showReadonlyHint";

export interface ConfigDocCandidateDto {
    relPath: string;
    codec: ConfigCodec;
    priority?: number;
}

export interface ConfigDocSpecDto {
    id: string;
    title: string;
    kind: ConfigDocKind;
    candidates: ConfigDocCandidateDto[];
    missing?: MissingPolicy;
    writable?: boolean;
    policy?: ConfigDocPolicy;
}

export interface ResolvedDocDto {
    spec: ConfigDocSpecDto;
    exists: boolean;
    chosen?: ConfigDocCandidateDto;
    absPath?: string;
}

export interface ResolvedDomainDto {
    domainId: string;
    label: string;
    icon?: string;
    description?: string;
    docs: ResolvedDocDto[];
    nav?: {
        group?: string;
        order?: number;
    };
}

export interface ConfigFileReadResultDto {
    codec: ConfigCodec;
    absPath: string;
    relPath: string;
    raw: string;
    data?: unknown;
}