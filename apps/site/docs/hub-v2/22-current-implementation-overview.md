# 22 当前实现总览

本文档用于把 Hub V2 当前代码实现、站点文档和后续开发入口对齐。早期 01-06 文档仍保留设计背景和基础原则；具体判断以当前模块、路由、菜单和 migration 为准。

## 1. 当前服务端模块

当前 `apps/hub-v2/server/src/modules` 已覆盖以下能力：

- 基础与账号：`auth`、`user`、`profile`、`organization`、`organization-title`、`project-title`。
- 项目与协作：`project`、`issue`、`rd`、`dashboard`、`worklog`、`content-log`。
- 内容与公开能力：`announcement`、`document`、`release`、`shared-config`、`feedback`、`survey`、`report-public`。
- 系统治理：`system-rbac`、`system-settings`、`audit-log`、`admin-search`、`search`。
- 财务与审批：`approval`、`approval-template`、`reimbursement`。
- 集成与实时：`api-token`、`personal-token`、`notifications`、`upload`、`ai`。

## 2. 当前路由前缀

服务端统一在 `apps/hub-v2/server/src/app/register-routes.ts` 注册路由：

- 管理端接口：`/api/admin/*`
- 公开接口：`/api/public/*`
- Project Token 接口：`/api/token/*`
- Personal Token 接口：`/api/personal/*`
- SPA 静态入口：`/` 与非 API fallback

`survey` 相关接口受 `SURVEY_ENABLED` 控制；公开 AI 报表接口挂在 `/api/public/*`。

## 3. 当前前端入口

当前 `apps/hub-v2/web/src/app/app.routes.ts` 的主要入口：

- 公共入口：`/login`、`/public/docs/:projectKey/:slug`、`/public/docs/:slug`、`/public/announcements/:announcementId`、可选 `/public/surveys/:slug`。
- 管理后台：`/admin`。
- 登录后工作台：`/dashboard`。
- 协作中心：`/issues`、`/rd`。
- 内容中心：`/content`，其中全局公告受 `ANNOUNCEMENT_GLOBAL_MANAGE_PERMISSION` 控制。
- 项目与用户：`/projects`、`/users`，其中 `/users` 是协作平台只读入口，完整用户管理仍在 `/admin/users`。
- 财务中心：`/reimbursements`、`/reimbursements/mine`、`/reimbursements/announcements` 等由报销路由承接。
- 个人与通知：`/profile`、`/notifications`。

左侧导航以 `apps/hub-v2/web/src/app/core/navigation/nav.config.ts` 为准，当前分为工作台、协作中心、内容中心、财务中心、系统管理。

## 4. 当前数据库基线

当前 migration 最新基线为：

- `0053_issue_rd_item_link.sql`

该 migration 为 `issues` 增加：

- `rd_item_id`
- `rd_no_snapshot`
- `rd_title_snapshot`
- `rd_status_snapshot`
- `idx_issues_rd_item_id`

因此 Issue/RD 已不再只是平行模块，文档中涉及测试单与研发项关系时，应同时参考 [24 Issue 与 RD 关联说明](/hub-v2/24-issue-rd-link) 与 [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)。

## 5. 文档阅读入口

- 架构、API、数据库、Web 基线：读 [02 架构设计文档](/hub-v2/02-architecture-design)、[03 数据库设计文档](/hub-v2/03-database-design)、[04 API 设计文档](/hub-v2/04-api-design)、[06 Web 架构设计文档](/hub-v2/06-web-architecture)。
- 协作域实现：读 [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)、[11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)、[24 Issue 与 RD 关联说明](/hub-v2/24-issue-rd-link)。
- 权限与组织：读 [20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)、[21 用户状态与后台登录语义](/hub-v2/21-user-status-and-login-semantics)、[25 授权底座方案](/hub-v2/25-authorization-foundation-design)。
- 财务与审批：读 [23 财务与审批总览](/hub-v2/23-finance-approval-overview)、[26 报销 API 契约](/hub-v2/26-reimbursement-api-contract)、[27 报销 API 示例](/hub-v2/27-reimbursement-api-examples)。
