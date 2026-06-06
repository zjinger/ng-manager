# 使用指南

Hub V2 文档正式入口。当前文档集不再按历史编号阅读，而是按产品域和工程域组织：总览、协作域、项目与组织治理、财务与审批、集成与公开能力、迁移与运维。

---

## 推荐阅读路径

### 新同事入门

1. [22 当前实现总览](/hub-v2/22-current-implementation-overview)：先确认当前模块、路由、菜单和 migration 基线。
2. [02 架构设计文档](/hub-v2/02-architecture-design)：理解服务端分层、模块依赖、Contract、RequestContext、EventBus。
3. [03 数据库设计文档](/hub-v2/03-database-design)：理解核心表、迁移原则和当前数据库演进口径。
4. [04 API 设计文档](/hub-v2/04-api-design)：理解接口前缀、响应结构、分页、错误和模块摘要。
5. [06 Web 架构设计文档](/hub-v2/06-web-architecture)：理解前端路由、菜单、Core/Shared/Features 分层。

### 协作域开发

- Issue：读 [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)。
- RD：读 [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)、[11 RD 产品需求](/hub-v2/11-rd-product-requirements)、[30 RD UI 设计说明](/hub-v2/30-rd-ui-specification)、[31 RD 收口回归清单](/hub-v2/31-rd-closure-regression-checklist)。
- Issue/RD 关联：读 [24 Issue 与 RD 关联说明](/hub-v2/24-issue-rd-link)。
- 项目模块：读 [29 项目管理子项目/模块 Phase 2 设计方案](/hub-v2/29-project-module-phase2-design)。
- 通知与上传：读 [18 通知机制](/hub-v2/18-notification-mechanism)、[14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification)、[19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)、[32 上传策略盘点与治理建议](/hub-v2/32-upload-strategy-audit)。

### 权限治理

- 项目规则：读 [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)。
- 项目 RBAC：读 [16 项目治理与 RBAC 结合方案](/hub-v2/16-project-governance-rbac-design)。
- 系统 RBAC 收口：读 [20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)。
- 用户状态与后台登录：读 [21 用户状态与后台登录语义](/hub-v2/21-user-status-and-login-semantics)。
- 错误码：读 [16 全局错误码规范](/hub-v2/16-error-code-governance)。

### 报销审批

1. [23 财务与审批总览](/hub-v2/23-finance-approval-overview)：先确认财务、审批、报销、工作台之间的边界。
2. [25 授权底座方案](/hub-v2/25-authorization-foundation-design)：理解组织关系、系统角色、审批关系和财务权限。
3. [26 报销模块 API 联调说明](/hub-v2/26-reimbursement-api-contract)：对接报销接口时作为契约基线。
4. [27 报销模块 API 示例请求](/hub-v2/27-reimbursement-api-examples)：前端联调请求体示例。
5. [28 单工作台融合与可配置方案](/hub-v2/28-unified-dashboard-design)：理解 `/dashboard` 统一首页和报销卡片展示策略。

### 集成联调

- webapp 接入 Hub V2：读 [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)。
- AI Agent / MCP 接入 Hub V2：读 [33 MCP 与 Agent Connection 配置收口方案](/hub-v2/33-mcp-agent-connection-config)。
- Token、Personal Token、Project Token 的路由前缀和读写边界：同时参考 [04 API 设计文档](/hub-v2/04-api-design) 与 [22 当前实现总览](/hub-v2/22-current-implementation-overview)。
- 公开内容、问卷、搜索、公开报表、AI 报表等能力当前以实际路由注册为准，入口汇总见 [22 当前实现总览](/hub-v2/22-current-implementation-overview)。

### 上线运维

1. [05 实施路线图](/hub-v2/05-implementation-roadmap)：按阶段拆任务。
2. [08 数据迁移映射清单](/hub-v2/08-migration-mapping)：确认 v1 -> v2 数据映射。
3. [09 迁移执行 Runbook](/hub-v2/09-migration-runbook)：执行演练、正式切流与回滚。
4. [12 内网部署与迁移执行](/hub-v2/12-deploy-intranet)：按 192.168.1.31 部署口径执行。
5. [17 发布流程规范](/hub-v2/17-release-process)：版本号、升级说明、changelog、部署和回滚。

## 文档目录

### 总览

- [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)
- [02 架构设计文档](/hub-v2/02-architecture-design)
- [03 数据库设计文档](/hub-v2/03-database-design)
- [04 API 设计文档](/hub-v2/04-api-design)
- [05 实施路线图](/hub-v2/05-implementation-roadmap)
- [06 Web 架构设计文档](/hub-v2/06-web-architecture)
- [22 当前实现总览](/hub-v2/22-current-implementation-overview)

### 协作域

- [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)
- [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)
- [11 RD 产品需求](/hub-v2/11-rd-product-requirements)
- [14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification)
- [18 通知机制](/hub-v2/18-notification-mechanism)
- [19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)
- [24 Issue 与 RD 关联说明](/hub-v2/24-issue-rd-link)
- [29 项目管理子项目/模块 Phase 2 设计方案](/hub-v2/29-project-module-phase2-design)
- [30 RD UI 设计说明](/hub-v2/30-rd-ui-specification)
- [31 RD 收口回归清单](/hub-v2/31-rd-closure-regression-checklist)
- [32 上传策略盘点与治理建议](/hub-v2/32-upload-strategy-audit)

### 项目与组织治理

- [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)
- [16 项目治理与 RBAC 结合方案](/hub-v2/16-project-governance-rbac-design)
- [16 全局错误码规范](/hub-v2/16-error-code-governance)
- [20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)
- [21 用户状态与后台登录语义](/hub-v2/21-user-status-and-login-semantics)

### 财务与审批

- [23 财务与审批总览](/hub-v2/23-finance-approval-overview)
- [25 授权底座方案](/hub-v2/25-authorization-foundation-design)
- [26 报销模块 API 联调说明](/hub-v2/26-reimbursement-api-contract)
- [27 报销模块 API 示例请求](/hub-v2/27-reimbursement-api-examples)
- [28 单工作台融合与可配置方案](/hub-v2/28-unified-dashboard-design)

### 集成与公开能力

- [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)
- [33 MCP 与 Agent Connection 配置收口方案](/hub-v2/33-mcp-agent-connection-config)

### 迁移与运维

- [08 数据迁移映射清单](/hub-v2/08-migration-mapping)
- [09 迁移执行 Runbook](/hub-v2/09-migration-runbook)
- [12 内网部署与迁移执行](/hub-v2/12-deploy-intranet)
- [17 发布流程规范](/hub-v2/17-release-process)

## 当前维护口径

- `apps/site/docs/hub-v2` 是正式阅读入口。
- `apps/hub-v2/server/docs` 中迁入过来的文档保留原位置，不在本次整理中删除。
- 新增业务域文档优先落到 `apps/site/docs/hub-v2`，再按侧边栏分类挂接。
- 涉及模块、路由、菜单、migration 的事实，以 `register-routes.ts`、`app.routes.ts`、`nav.config.ts` 和最新 migration 为准。
