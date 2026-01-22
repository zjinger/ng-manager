import { isDeepStrictEqual } from "node:util";
import { AppError } from "../../../common/errors";
import type { ConfigPatch, PatchConflictDetail } from "./patch.model";
import { getByDotPath } from "./path-access";

export function assertPatchBeforeMatch(workspaceRaw: any, patch: ConfigPatch) {
    const conflicts: PatchConflictDetail[] = [];

    for (const ch of patch.changes) {
        const current = getByDotPath(workspaceRaw, ch.path);

        const ok = isDeepStrictEqual(current, ch.before);
        if (!ok) {
            conflicts.push({
                path: ch.path,
                expectedBefore: ch.before,
                actualCurrent: current,
            });
        }
    }

    if (conflicts.length > 0) {
        throw new AppError(
            "CONFIG_CONFLICT",
            "Workspace has changed since last loaded. Patch 'before' does not match current workspace.",
            { conflicts }
        );
    }
}
