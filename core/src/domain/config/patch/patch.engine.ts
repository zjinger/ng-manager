import { WorkspaceModel } from "../workspace";
import { ConfigPatch } from "./patch.model";
import { setByDotPath } from "./path-access";

export type ApplyPatchOptions = {
    /**
     * 严格写入：路径不存在就报错（避免误写出脏字段）
     * 默认 false：“自动补齐对象路径”
     */
    strict?: boolean;
};

export function applyPatch(
    workspace: WorkspaceModel,
    patch: ConfigPatch,
    opts: ApplyPatchOptions = {}
): WorkspaceModel {
    const next = structuredClone(workspace);
    const strict = opts.strict === true;

    for (const change of patch.changes) {
        setByDotPath(next.raw, change.path, change.after, !strict);
    }
    return next;
}
