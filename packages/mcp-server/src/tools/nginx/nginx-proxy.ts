import type { ToolContext } from "../../context/tool-context";
import type { NginxProxySaveArgs } from "../controlled/schemas";

export type NginxProxyRequest = {
  name: string;
  listen: string[];
  domains: string[];
  enabled?: boolean;
  protocol?: "http" | "https";
  ssl?: boolean;
  sslCert?: string;
  sslKey?: string;
  root?: string;
  index?: string[];
  extraConfig?: string;
  locations: Array<{
    path: string;
    proxyPass?: string;
  }>;
  createdBy?: string;
};

function validateProxyTarget(target: string): URL {
  if (/[\r\n;{}]/.test(target) || target.includes("`") || target.includes("$(")) {
    throw new Error("target contains unsafe characters");
  }
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("target must be a valid URL");
  }
  const allowed = new Set(["http:", "https:", "ws:", "wss:"]);
  if (!allowed.has(url.protocol)) throw new Error("target protocol must be http, https, ws, or wss");
  if (!url.hostname) throw new Error("target hostname is required");
  return url;
}

function assertSafeNginxToken(label: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} cannot be empty`);
  if (normalized !== value || /[\r\n;{}]/.test(normalized) || normalized.includes("`") || normalized.includes("$(") || normalized.includes("${")) {
    throw new Error(`${label} contains unsafe Nginx control characters`);
  }
  return normalized;
}

function validatePortText(label: string, value: string): void {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must use a port between 1 and 65535`);
  }
}

function validateListenValue(value: string): string {
  const listen = assertSafeNginxToken("listen", value);
  if (/\s/.test(listen)) throw new Error("listen must be a port or host:port without whitespace");
  if (/^\d{1,5}$/.test(listen)) {
    validatePortText("listen", listen);
    return listen;
  }

  const hostPort = listen.match(/^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[[0-9a-fA-F:.]+\]|[A-Za-z0-9.-]+):(\d{1,5})$/);
  if (!hostPort) throw new Error("listen must be a port or host:port");
  validatePortText("listen", hostPort[2]!);
  return listen;
}

function validateDomainValue(value: string): string {
  const domain = assertSafeNginxToken("domain", value);
  if (/[\s/\\]/.test(domain)) throw new Error("domain must not contain whitespace or path separators");
  return domain;
}

function validateLocationPath(value: string): string {
  const locationPath = assertSafeNginxToken("locationPath", value);
  if (!locationPath.startsWith("/")) throw new Error("locationPath must start with /");
  if (/\s/.test(locationPath)) throw new Error("locationPath must not contain whitespace");
  return locationPath;
}

export function normalizeProxyRequest(args: NginxProxySaveArgs, existing?: Record<string, any> | null): NginxProxyRequest {
  const target = validateProxyTarget(args.target).toString();
  const domains = args.domains ?? existing?.domains;
  const listen = args.listen ?? existing?.listen;
  const name = args.name ?? existing?.name ?? domains?.[0];

  if (!name) throw new Error("name is required when creating a new proxy server");
  if (!domains?.length) throw new Error("domains is required when creating a new proxy server");
  if (!listen?.length) throw new Error("listen is required when creating a new proxy server");

  return {
    name,
    listen: listen.map((item: string) => validateListenValue(item)),
    domains: domains.map((item: string) => validateDomainValue(item)),
    enabled: args.enabled ?? existing?.enabled ?? true,
    protocol: existing?.ssl ? "https" : "http",
    ssl: existing?.ssl ?? false,
    sslCert: existing?.sslCert,
    sslKey: existing?.sslKey,
    root: existing?.root,
    index: existing?.index,
    extraConfig: existing?.extraConfig,
    locations: [{ path: validateLocationPath(args.locationPath ?? "/"), proxyPass: target }],
    createdBy: existing?.createdBy ?? "ngm-mcp",
  };
}

export function sanitizeNginxServerForAgent(server: any): unknown {
  if (!server) return server;
  return {
    id: server.id,
    name: server.name,
    listen: server.listen,
    domains: server.domains,
    enabled: server.enabled,
    ssl: Boolean(server.ssl),
    locations: Array.isArray(server.locations)
      ? server.locations.map((item: any) => ({
        path: item?.path,
        proxyPass: item?.proxyPass,
      }))
      : undefined,
    sslCert: server.sslCert ? "[REDACTED_PATH]" : undefined,
    sslKey: server.sslKey ? "[REDACTED_PATH]" : undefined,
    extraConfig: server.extraConfig ? "[REDACTED]" : undefined,
  };
}

export function sanitizeNginxProxyRequestForAgent(request: NginxProxyRequest): unknown {
  return sanitizeNginxServerForAgent({
    ...request,
    id: undefined,
  });
}

export async function rollbackNginxProxySave(
  context: ToolContext,
  mode: "create" | "update",
  serverId: string | undefined,
  saved: Record<string, any> | null,
  existing: Record<string, any> | null
): Promise<Record<string, unknown>> {
  const nginx = context.services.core.nginx;
  try {
    if (mode === "create") {
      const savedId = typeof saved?.id === "string" ? saved.id : undefined;
      if (!savedId) return { status: "not_possible", reason: "created server id was not returned" };
      const result = await nginx.server.deleteServer(savedId);
      const validation = await nginx.config.validateConfig();
      return {
        status: validation.valid ? "rolled_back" : "failed",
        action: "delete-created-server",
        result,
        validation,
        ...(validation.valid ? {} : { reason: "Nginx config is still invalid after rollback" }),
      };
    }

    if (!serverId || !existing) return { status: "not_possible", reason: "original server snapshot is unavailable" };
    const restored = await nginx.server.updateServer(serverId, existing);
    const validation = await nginx.config.validateConfig();
    return {
      status: validation.valid ? "rolled_back" : "failed",
      action: "restore-previous-server",
      server: sanitizeNginxServerForAgent(restored),
      validation,
      ...(validation.valid ? {} : { reason: "Nginx config is still invalid after rollback" }),
    };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
