import type { ApiEnvVariable } from '@app/models/api-environment.model';
import { KvRow } from '@models/index';

export function envVarsToRows(vars: ApiEnvVariable[]): KvRow[] {
    return (vars ?? []).map(v => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
    }));
}

export function rowsToEnvVars(
    rows: KvRow[],
    prev?: ApiEnvVariable[]
): ApiEnvVariable[] {
    const prevMap = new Map(prev?.map(v => [v.key, v]));
    return rows
        .filter(r => r.key?.trim())
        .map(r => ({
            key: r.key.trim(),
            value: String(r.value ?? ''),
            enabled: r.enabled !== false,
            secret: prevMap.get(r.key)?.secret, 
        }));
}
