import type { McpToolDefinition } from "../index";
import { blocked, controlledFields, isConfirmed, operation } from "../controlled/operation-result";
import { nginxProxySaveSchema, nginxReloadSchema, type NginxProxySaveArgs } from "../controlled/schemas";
import {
  normalizeProxyRequest,
  rollbackNginxProxySave,
  sanitizeNginxProxyRequestForAgent,
  sanitizeNginxServerForAgent,
  type NginxProxyRequest,
} from "./nginx-proxy";
import { ok } from "../../utils/result";
import { requiredEnv, requireExecutePolicy, requireWritePolicy } from "../controlled/operation-policy";

function reloadTool(): McpToolDefinition {
  return {
    name: "ngm_nginx_reload",
    description: "Skill ngm-nginx. Controlled execute tool for validating and reloading only the ng-manager managed local Nginx instance. Prefer this over direct nginx commands because it uses ng-manager's local service boundary and audit. Previews validation by default; real reload requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true and is refused when validation fails.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    deferPolicyToHandler: true,
    isConfirmed,
    inputSchema: nginxReloadSchema,
    async handler(args, context) {
      const confirmed = isConfirmed(args);
      const nginx = context.services.core.nginx;
      const instance = nginx.service.getInstance();
      const status = await nginx.service.getStatus().catch((error: unknown) => ({
        isRunning: false,
        error: error instanceof Error ? error.message : String(error),
      }));
      const validation = await nginx.config.validateConfig();
      const safetyMessage = "Validate and reload the ng-manager managed local Nginx instance.";
      const preview = {
        ...controlledFields("execute", confirmed, requiredEnv("execute")),
        operation: operation("preview", "service-control", "high", safetyMessage),
        instance: instance ? { path: instance.path, configPath: instance.configPath } : null,
        status,
        validation,
      };

      if (!validation.valid) {
        return ok("ngm_nginx_reload", { ...preview, operation: operation("blocked", "service-control", "high", safetyMessage), reason: "Nginx config validation failed; reload refused." });
      }
      if (!confirmed) return ok("ngm_nginx_reload", preview);

      const policyBlock = requireExecutePolicy("service-control", "high", safetyMessage);
      if (policyBlock) return ok("ngm_nginx_reload", { ...controlledFields("execute", true, requiredEnv("execute")), ...policyBlock });

      return ok("ngm_nginx_reload", {
        ...preview,
        ...controlledFields("execute", true, requiredEnv("execute")),
        operation: operation("executed", "service-control", "high", safetyMessage),
        result: await nginx.service.reload(),
      });
    },
  };
}

function proxySaveTool(): McpToolDefinition {
  return {
    name: "ngm_nginx_proxy_save",
    description: "Skill ngm-nginx. Controlled write tool for creating or updating ng-manager managed Nginx proxy server blocks. Prefer this over editing Nginx files directly because it validates inputs, redacts sensitive fields, rolls back invalid saves, and audit logs confirmed writes. Previews by default; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It never writes arbitrary file paths and reloads only when reloadAfterSave=true plus execute policy is enabled.",
    riskLevel: "write",
    allowPreviewWhenBlocked: true,
    deferPolicyToHandler: true,
    isConfirmed,
    inputSchema: nginxProxySaveSchema,
    async handler(args, context) {
      const confirmed = isConfirmed(args);
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
        ...controlledFields("write", confirmed, requiredEnv("write")),
        operation: operation("preview", "write", "high", safetyMessage),
        mode,
        serverId: proxyArgs.serverId,
        before: sanitizeNginxServerForAgent(existing),
        afterRequest: sanitizeNginxProxyRequestForAgent(request),
        reloadAfterSave: proxyArgs.reloadAfterSave === true,
        reloadRequired: true,
      };
      if (!confirmed) return ok("ngm_nginx_proxy_save", preview);

      const policyBlock = requireWritePolicy("high", safetyMessage);
      if (policyBlock) return ok("ngm_nginx_proxy_save", { ...controlledFields("write", true, requiredEnv("write")), ...policyBlock });

      const saved = proxyArgs.serverId ? await nginx.server.updateServer(proxyArgs.serverId, request) : await nginx.server.createServer(request);
      const validation = await nginx.config.validateConfig();
      if (!validation.valid) {
        const rollback = await rollbackNginxProxySave(context, mode, proxyArgs.serverId, saved as Record<string, any>, existing as Record<string, any> | null);
        return ok("ngm_nginx_proxy_save", {
          ...preview,
          ...controlledFields("write", true, requiredEnv("write")),
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
        ...controlledFields("write", true, requiredEnv("write")),
        operation: operation("executed", "write", "high", safetyMessage),
        server: sanitizeNginxServerForAgent(saved),
        validation,
        reloadRequired: true,
      };
      if (proxyArgs.reloadAfterSave === true) {
        const reloadBlock = requireExecutePolicy("service-control", "high", "Reload after saving a managed Nginx proxy server block.");
        if (reloadBlock) result.reload = { status: "blocked", action: "execute", confirmed: true, requires: requiredEnv("execute"), errorCode: reloadBlock.errorCode, reason: "reloadAfterSave requires NGM_MCP_ALLOW_EXECUTE=true" };
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
