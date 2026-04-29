import type {
    SvnRuntimeDto,
    SvnSyncMode,
    SvnSyncRequestDto,
    SvnSyncResultDto,
    SvnSyncRuntimePayload,
    SvnSyncTargetTypeDto,
} from "@yinuo-ngm/protocol";

export type { SvnSyncMode } from "@yinuo-ngm/protocol";

export type SvnCheckoutOptions = SvnSyncRequestDto;
export type SvnSyncTargetType = SvnSyncTargetTypeDto;
export type SvnSyncResult = SvnSyncResultDto;
export type SvnRuntime = SvnRuntimeDto | SvnSyncRuntimePayload;
