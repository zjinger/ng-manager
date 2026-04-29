export type SvnSyncTargetTypeDto = "icons" | "images";

export interface SvnSyncRequestDto {
    forceRefresh?: boolean;
    types?: SvnSyncTargetTypeDto[];
    generateAfterCheckout?: boolean;
}
