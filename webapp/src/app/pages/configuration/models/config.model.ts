import type { ConfigDetectResult, ConfigDocument } from "./config-domain.model";

export type ResolvedDomain = ConfigDetectResult;
export type DomainSchemaDoc<VM = unknown> = ConfigDocument<VM>;
