import type { ApiEnvVariable, ApiRequestKvRow } from '@models/api-client';
import { } from '@models/index';
import { uniqueId } from 'lodash';

export function envVarsToRows(vars: ApiEnvVariable[]): ApiRequestKvRow[] {
    return (vars ?? []).map(v => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
        id: uniqueId(),
    }));
}

export function rowsToEnvVars(
    rows: ApiRequestKvRow[],
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
