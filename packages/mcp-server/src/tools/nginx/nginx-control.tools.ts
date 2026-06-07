import type { McpToolDefinition } from "../index";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { nginxProxySaveSchema, nginxReloadSchema, type NginxProxySaveArgs } from "../controlled/schemas";
import {
  normalizeProxyRequest,
  rollbackNginxProxySave,
  sanitizeNginxProxyRequestForAgent,
  sanitizeNginxServerForAgent,
  type NginxProxyRequest,
} from "./nginx-proxy";
import { ok } from "../../utils/result";
import { requireExecutePolicy, requireWritePolicy } from "../controlled/operation-policy";

function reloadTool(): McpToolDefinition {
  return {
    name: "ngm_nginx_reload",
    description: "Skill ngm-nginx. Controlled service-control execute tool for reloading only the ng-manager managed local Nginx instance. Supports dry-run/preview; real reload requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It validates config before reload and refuses reload when validation fails.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    isConfirmed,
    inputSchema: nginxReloadSchema,
    async handler(args, context) {
      const nginx = context.services.core.nginx;
      const instance = nginx.service.getInstance();
      const status = await nginx.service.getStatus().catch((error: unknown) => ({
        isRunning: false,
        error: error instanceof Error ? error.message : String(error),
      }));
      const validation = await nginx.config.validateConfig();
      const safetyMessage = "Validate and reload the ng-manager managed local Nginx instance.";
      const preview = {
        operation: operation("preview", "service-control", "high", safetyMessage),
        instance: instance ? { path: instance.path, configPath: instance.configPath } : null,
        status,
        validation,
      };

      if (!validation.valid) {
        return ok("ngm_nginx_reload", { ...preview, operation: operation("blocked", "service-control", "high", safetyMessage), reason: "Nginx config validation failed; reload refused." });
      }
      if (!isConfirmed(args)) return ok("ngm_nginx_reload", preview);

      const policyBlock = requireExecutePolicy("service-control", "high", safetyMessage);
      if (policyBlock) return ok("ngm_nginx_reload", policyBlock);

      return ok("ngm_nginx_reload", {
        ...preview,
        operation: operation("executed", "service-control", "high", safetyMessage),
        result: await nginx.service.reload(),
      });
    },
  };
}

function proxySaveTool(): McpToolDefinition {
  return {
    name: "ngm_nginx_proxy_save",
    description: "Skill ngm-nginx. Controlled write tool for creating or updating ng-manager managed Nginx proxy server blocks. Supports dry-run/preview; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It validates key proxy fields, does not write arbitrary file paths, and does not reload unless reloadAfterSave=true with execute policy enabled.",
    riskLevel: "write",
    allowPreviewWhenBlocked: true,
    isConfirmed,
    inputSchema: nginxProxySaveSchema,
    async handler(args, context) {
      const nginx = context.services.core.nginx;
      const proxyArgs = args as NginxProxySaveArgs;
      const existing = proxyArgs.serverId ? await nginx.server.getServer(proxyArgs.serverId) : null;
      if (proxyArgs.serverId && !existing) {
        return ok("ngm_nginx_proxy_save", blocked("write", "high", "Save a managed Nginx proxy server block.", "serverId not found"));
      }

      let request: NginxProxyRequest;
      try {
        request = normalizeProxyRequest(proxyArgs, existing as Record<string, any> | null);
      } catch (error) {
        return ok("ngm_nginx_proxy_save", blocked("write", "high", "Save a managed Nginx proxy server block.", "invalid Nginx proxy input", {
          error: error instanceof Error ? error.message : String(error),
        }));
      }

      const safetyMessage = `${proxyArgs.serverId ? "Update" : "Create"} ng-manager managed Nginx proxy server "${request.name}".`;
      const mode = proxyArgs.serverId ? "update" : "create";
      const preview = {
        operation: operation("preview", "write", "high", safetyMessage),
        mode,
        serverId: proxyArgs.serverId,
        before: sanitizeNginxServerForAgent(existing),
        afterRequest: sanitizeNginxProxyRequestForAgent(request),
        reloadAfterSave: proxyArgs.reloadAfterSave === true,
        reloadRequired: true,
      };
      if (!isConfirmed(proxyArgs)) return ok("ngm_nginx_proxy_save", preview);

      const policyBlock = requireWritePolicy("high", safetyMessage);
      if (policyBlock) return ok("ngm_nginx_proxy_save", policyBlock);

      const saved = proxyArgs.serverId ? await nginx.server.updateServer(proxyArgs.serverId, request) : await nginx.server.createServer(request);
      const validation = await nginx.config.validateConfig();
      if (!validation.valid) {
        const rollback = await rollbackNginxProxySave(context, mode, proxyArgs.serverId, saved as Record<string, any>, existing as Record<string, any> | null);
        return ok("ngm_nginx_proxy_save", {
          ...preview,
          operation: operation("failed", "write", "high", safetyMessage),
          result: { status: "failed", reason: "Nginx config validation failed after save" },
          server: sanitizeNginxServerForAgent(saved),
          validation,
          rollback,
          reloadRequired: true,
        });
      }

      const result: Record<string, unknown> = {
        ...preview,
        operation: operation("executed", "write", "high", safetyMessage),
        server: sanitizeNginxServerForAgent(saved),
        validation,
        reloadRequired: true,
      };
      if (proxyArgs.reloadAfterSave === true) {
        const reloadBlock = requireExecutePolicy("service-control", "high", "Reload after saving a managed Nginx proxy server block.");
        if (reloadBlock) result.reload = { status: "blocked", reason: "reloadAfterSave requires NGM_MCP_ALLOW_EXECUTE=true" };
        else {
          result.reload = { status: "executed", result: await nginx.service.reload() };
          result.reloadRequired = false;
        }
      }
      return ok("ngm_nginx_proxy_save", result);
    },
  };
}

export function nginxControlTools(): McpToolDefinition[] {
  return [reloadTool(), proxySaveTool()];
}
