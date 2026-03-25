type CookieJarEntry = {
    value: string;
    updatedAt: number;
};

const jars = new Map<string, CookieJarEntry>();

function cookieNameFromSetCookie(setCookie: string): string | null {
    const pair = String(setCookie ?? "").split(";")[0]?.trim();
    if (!pair) return null;
    const idx = pair.indexOf("=");
    if (idx <= 0) return null;
    return pair.slice(0, idx).trim().toLowerCase();
}

function mergeCookieString(oldCookie: string, setCookies: string[]): string {
    const next = new Map<string, string>();

    for (const token of String(oldCookie ?? "").split(";")) {
        const pair = token.trim();
        if (!pair) continue;
        const idx = pair.indexOf("=");
        if (idx <= 0) continue;
        const name = pair.slice(0, idx).trim().toLowerCase();
        next.set(name, pair);
    }

    for (const sc of setCookies ?? []) {
        const pair = String(sc ?? "").split(";")[0]?.trim();
        if (!pair) continue;
        const name = cookieNameFromSetCookie(sc);
        if (!name) continue;
        next.set(name, pair);
    }

    return Array.from(next.values()).join("; ");
}

export function getCookieJar(sessionKey: string): string | undefined {
    return jars.get(sessionKey)?.value;
}

export function clearCookieJar(sessionKey: string): void {
    jars.delete(sessionKey);
}

export function mergeCookieJar(sessionKey: string, setCookies: string[]): string | undefined {
    if (!Array.isArray(setCookies) || setCookies.length === 0) return jars.get(sessionKey)?.value;
    const oldCookie = jars.get(sessionKey)?.value ?? "";
    const merged = mergeCookieString(oldCookie, setCookies);
    if (!merged) return undefined;
    jars.set(sessionKey, { value: merged, updatedAt: Date.now() });
    return merged;
}
