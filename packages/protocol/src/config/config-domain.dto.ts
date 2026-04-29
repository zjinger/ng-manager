import type { ConfigFileReadResultDto } from "./config-catalog.dto";

export interface ConfigSchemaItemDto {
    key: string;
    virtualKey?: string;
    label: string;
    type: string;
    level?: "basic" | "advanced";
    desc?: string;
    optionsRef?: {
        key: string;
        allowEmpty?: boolean;
    };
    options?: Array<{ label: string; value: unknown }>;
    default?: unknown;
    children?: ConfigSchemaItemDto[];
    item?: {
        type: "object" | "string" | "number" | "boolean";
        fields?: ConfigSchemaItemDto[];
    };
}

export interface ConfigSchemaSectionDto {
    id: string;
    label: string;
    target?: string;
    multiple?: boolean;
    defaultRefKey?: string;
    items: ConfigSchemaItemDto[];
}

export interface ConfigSchemaDto {
    id: string;
    label: string;
    sections: ConfigSchemaSectionDto[];
}

export interface DomainSchemaDocDto<VM = unknown> {
    domainId: string;
    schema: ConfigSchemaDto;
    vm: VM;
    options?: Record<string, unknown>;
    meta?: Record<string, unknown>;
}

export interface DomainSchemaDiffResultDto {
    docPatch?: Record<string, unknown>;
    filePatch?: Array<{
        relPath: string;
        codec: string;
        patch: unknown;
    }>;
}