---
name: ngm-nginx
description: Use this skill when the user asks about ng-manager Nginx management, local Nginx start/stop/reload, proxy configuration, local port forwarding, Angular/Vue/Node dev server proxying, Nginx server blocks, checking Nginx status, or diagnosing local proxy problems.
---

# NGM Nginx

## Purpose

This skill describes how AI agents should handle local Nginx management tasks in ng-manager.

ng-manager can manage local Nginx as part of its local engineering control plane. Nginx is used for proxying local frontend/backend services, local ports, and project development routes.

This skill is about local Nginx control, not Hub V2 collaboration data.

## Use This Skill For

- Checking Nginx status
- Starting local Nginx
- Stopping local Nginx
- Reloading Nginx
- Listing proxy rules
- Inspecting Nginx server blocks
- Creating or updating local proxy configuration
- Diagnosing local proxy failures
- Checking whether a frontend/backend dev server is proxied correctly
- Understanding ng-manager Nginx package capability

## Do Not Use This Skill For

- Hub V2 documents
- Hub V2 issues
- RD workflows
- Project Token operations

Use `hub-v2-api` or `hub-v2-docs` for those tasks.

## Preferred MCP Tool Domains

When available, prefer MCP tools with names like:

```text
ngm_nginx_status
ngm_nginx_servers_list
ngm_nginx_server_get
ngm_nginx_upstreams_list
ngm_nginx_config_validate
ngm_nginx_config_get_main
ngm_nginx_logs_tail
ngm_nginx_reload
ngm_nginx_proxy_save
ngm_proxy_list
ngm_proxy_validate
```

If exact tool names differ, choose tools whose descriptions mention:

```text
nginx
proxy
server block
port forwarding
reload
local service
```

## Recommended Workflow

### Diagnose proxy issue

1. Check whether Nginx is running
2. List proxy configuration
3. Check target local service port
4. Check whether the local project process is running
5. Validate Nginx config if supported
6. Preview `ngm_nginx_reload` only when reload is explicitly requested
7. Execute reload only after config validation, user confirmation, and MCP execute policy

### Modify proxy configuration

Before modifying:

1. Show existing proxy rule
2. Show intended new rule
3. Explain impacted ports and target services
4. Preview `ngm_nginx_proxy_save`
5. Write config only after explicit confirmation and MCP write policy
6. Do not reload by default; reload only when explicitly requested

Confirmed reload requires `NGM_MCP_ALLOW_EXECUTE=true`. Confirmed proxy save requires `NGM_MCP_ALLOW_WRITE=true`.

## Safety Rules

- Do not start or stop Nginx through current MCP tools.
- Do not reload Nginx unless explicitly requested, previewed, validated, and confirmed.
- Do not overwrite Nginx config without user intent and controlled tool confirmation.
- Use `ngm_nginx_proxy_save` only for ng-manager managed server/proxy blocks; never write arbitrary file paths.
- Prefer read-only inspection first.
- Do not expose sensitive local paths unless necessary.
- If config validation is available, run validation before reload.
