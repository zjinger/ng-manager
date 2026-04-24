import { CoreError, CoreErrorCodes } from "../../common/errors";

export function safeSvnPath(p: string) {
    return p.includes("@") && !p.endsWith("@") ? `${p}@` : p;
}

export function normalizeSvnUrl(raw: string): string {
    let url = (raw || "").trim();
    if (!url) return "";

    const hasPeg = url.includes("@");
    const needPegSuffix = hasPeg && !url.endsWith("@");
    if (needPegSuffix) url = `${url}@`;

    const pegSuffix = url.endsWith("@") ? "@" : "";
    if (pegSuffix) url = url.slice(0, -1);

    const m = url.match(/^([a-zA-Z+]+:\/\/[^/]+)(\/.*)?$/);
    if (!m) return pegSuffix ? url + pegSuffix : url;

    const base = m[1];
    const pathPart = m[2] || "";

    const parts = pathPart.split("/").map((seg) => {
        if (!seg) return "";
        try {
            return encodeURIComponent(decodeURIComponent(seg));
        } catch {
            return encodeURIComponent(seg);
        }
    });

    const normalized = base + parts.join("/");
    return pegSuffix ? normalized + pegSuffix : normalized;
}

export function assertNotNested(mainUrl: string, miscUrl?: string) {
    if (!miscUrl) return;
    if (mainUrl.startsWith(miscUrl) || miscUrl.startsWith(mainUrl)) {
        throw new CoreError(CoreErrorCodes.INVALID_REPO_URL, "SVN URLs cannot be parent/child of each other");
    }
}