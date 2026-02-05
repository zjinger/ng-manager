import type { ApiEnvVariable } from '@models/api-client/api-environment.model';

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function envVarsToRecord(vars: ApiEnvVariable[] = []): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of vars) {
        if (!v.enabled) continue;
        out[v.key] = String(v.value ?? '');
    }
    return out;
}

export function findVariables(input: string): string[] {
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = VAR_RE.exec(input))) found.add(m[1]);
    return [...found];
}

export function resolveTemplate(
    input: string,
    vars: Record<string, string>
): { out: string; missing: string[] } {
    const missing = new Set<string>();
    const out = input.replace(VAR_RE, (_, key) => {
        if (key in vars) return String(vars[key] ?? '');
        missing.add(key);
        return `{{${key}}}`;
    });
    return { out, missing: [...missing] };
}

/** 扫描一组字符串，返回缺失变量集合 */
export function collectMissingFromStrings(
    inputs: string[],
    vars: Record<string, string>
): string[] {
    const miss = new Set<string>();
    for (const s of inputs) {
        if (!s) continue;
        const { missing } = resolveTemplate(s, vars);
        missing.forEach(k => miss.add(k));
    }
    return [...miss];
}
