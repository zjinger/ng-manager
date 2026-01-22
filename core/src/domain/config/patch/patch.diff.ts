import { ConfigPatch } from "./patch.model";

export function diffToText(patch: ConfigPatch): string {
    return patch.changes
        .map(
            (c) =>
                `${c.path}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`
        )
        .join("\n");
}
