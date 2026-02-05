import crypto from "node:crypto";
import type { ApiEnvironmentEntity } from "../models/api-environment";
import type { ApiRequestEntity, ApiRequestKv } from "../models/api-request";

export type ResolveContext = {
    env?: ApiEnvironmentEntity | null;
    project?: { id?: string; root?: string };
    extra?: Record<string, string>;
};

type VarMap = Record<string, string>;

function buildVarMap(ctx: ResolveContext): VarMap {
    const vars: VarMap = {};

    // env vars
    if (ctx.env?.variables?.length) {
        for (const v of ctx.env.variables) {
            if (!v.enabled) continue;
            vars[v.key] = String(v.value ?? "");
        }
    }

    // built-ins
    vars["$timestamp"] = String(Date.now());
    vars["$uuid"] = crypto.randomUUID();

    if (ctx.project?.id) vars["$projectId"] = ctx.project.id;
    if (ctx.project?.root) vars["$projectRoot"] = ctx.project.root;

    // extra
    if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) vars[k] = String(v ?? "");
    }

    return vars;
}

function resolveString(input: string, vars: VarMap): string {
    // {{ key }} 替换
    return input.replace(/{{\s*([^}]+?)\s*}}/g, (_m, rawKey) => {
        const key = String(rawKey ?? "").trim();
        if (!key) return "";
        // 未命中变量：保留原样（便于用户发现）
        return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
    });
}

function resolveAny(value: any, vars: VarMap): any {
    if (value == null) return value;
    if (typeof value === "string") {
        return resolveString(value, vars);
    }
    if (Array.isArray(value)) {
        return value.map((x) => resolveAny(x, vars));
    }
    if (typeof value === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(value)) {
            // key 本身也允许变量（可选；常见需求）
            const rk = resolveString(String(k), vars);
            out[rk] = resolveAny(v, vars);
        }
        return out;
    }
    return value;
}

function normalizeKvRows(rows: ApiRequestKv[] | undefined | null): Array<{ key: string; value: string }> {
    const list = Array.isArray(rows) ? rows : [];
    return list
        .filter((r) => (r?.enabled ?? true) && String(r?.key ?? "").trim())
        .map((r) => ({
            key: String(r.key ?? "").trim(),
            value: String(r.value ?? ""),
        }));
}
/**
 * 变量解析器
 * 支持 {{var}} + 内建变量 + 深度替换 JSON body
 * 
 */
export class VariableResolver {

    resolveRequest(req: ApiRequestEntity, ctx: ResolveContext) {
        const vars = buildVarMap(ctx);
        const url = resolveString(req.url ?? "", vars);
        // headers
        const headers: Record<string, string> = {};
        for (const h of normalizeKvRows(req.headers)) {
            headers[resolveString(h.key, vars)] = resolveString(h.value ?? "", vars);
        }
        // query
        const query = normalizeKvRows(req.query).map((q) => ({
            key: resolveString(q.key, vars),
            value: resolveString(q.value ?? "", vars),
        }));
        // path params
        const pathParams = normalizeKvRows(req.pathParams).map((p) => ({
            key: resolveString(p.key, vars),
            value: resolveString(p.value ?? "", vars),
        }));
        // body
        const body = req.body
            ? {
                ...req.body,
                content: resolveAny(req.body.content, vars),
                contentType: req.body.contentType ? resolveString(req.body.contentType, vars) : req.body.contentType,
            }
            : undefined;
        // auth
        const auth = req.auth ? resolveAny(req.auth, vars) : undefined;
        return { url, headers, query, pathParams, body, auth, vars };
    }
    resolveText(text: string, ctx: ResolveContext) {
        const vars = buildVarMap(ctx);
        return resolveString(text, vars);
    }
}
