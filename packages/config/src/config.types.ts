import { ConfigDocSpec, ConfigDocCandidate, ConfigDomain, type ConfigCodec } from "./domains";

export interface ResolvedDoc {
    spec: ConfigDocSpec;
    exists: boolean;
    chosen?: ConfigDocCandidate;
    absPath?: string;
}

export interface ResolvedDomain {
    domain: ConfigDomain;
    docs: ResolvedDoc[];
}

export interface ConfigFileReadResult<T = unknown> {
    codec: ConfigCodec;
    absPath: string;
    relPath: string;
    raw: string;
    data?: T;
}

export interface ConfigFileWriteOptions {
    format?: "preserve" | "pretty";
}
