import type { ConfigFileReadResultDto, ResolvedDocDto, ResolvedDomainDto } from "@yinuo-ngm/protocol";

export type ResolvedDoc = ResolvedDocDto;
export type ResolvedDomain = ResolvedDomainDto;
export type ConfigFileReadResult<T = unknown> = ConfigFileReadResultDto & { data?: T };
