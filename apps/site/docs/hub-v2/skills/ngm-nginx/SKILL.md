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
ngm_nginx_start
ngm_nginx_stop
ngm_nginx_reload
ngm_nginx_proxy_list
ngm_nginx_proxy_get
ngm_nginx_proxy_save
nginx_status
nginx_start
nginx_stop
nginx_reload
nginx_proxy_list
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
6. Reload Nginx only when explicitly requested or after a config change requested by the user

### Modify proxy configuration

Before modifying:

1. Show existing proxy rule
2. Show intended new rule
3. Explain impacted ports and target services
4. Write config only when user explicitly asks

## Safety Rules

- Do not start, stop, or reload Nginx unless explicitly requested.
- Do not overwrite Nginx config without user intent.
- Prefer read-only inspection first.
- Do not expose sensitive local paths unless necessary.
- If config validation is available, run validation before reload.