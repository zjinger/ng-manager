# 23 财务与审批总览

本文档作为 Hub V2 财务、审批、报销相关文档入口，避免授权底座、审批模板、报销接口、统一工作台散落在不同位置。

## 1. 当前边界

财务与审批域当前包含：

- 授权底座：系统 RBAC、组织关系、审批关系、业务权限。
- 审批模板：`approval-template` 模块承接固定阶段模板配置。
- 报销业务：`reimbursement` 模块承接差旅报销、普通费用报销、附件、提交审批、审批动作、统计、Word 导出。
- 统一工作台：`/dashboard` 作为默认首页，根据权限展示协作与报销卡片；报销入口在财务中心菜单中保留。

## 2. 权限与组织关系

报销审批链不只依赖系统角色，也依赖组织关系。当前稳定口径：

- 人员主数据以 `users` 为准。
- 组织职务使用 `organization_titles`。
- 项目职能使用 `project_titles` 与 `project_members.role_code`。
- 可登录状态由 `users.status` 与 `admin_accounts.status` 共同决定。
- 报销权限边界参考 `expense.*`、`approval.*`、`finance.*` 权限码。

详细设计见 [25 授权底座方案](/hub-v2/25-authorization-foundation-design)、[20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)、[21 用户状态与后台登录语义](/hub-v2/21-user-status-and-login-semantics)。

## 3. 报销联调入口

- 接口契约：见 [26 报销模块 API 联调说明](/hub-v2/26-reimbursement-api-contract)。
- 请求示例：见 [27 报销模块 API 示例请求](/hub-v2/27-reimbursement-api-examples)。
- 工作台融合：见 [28 单工作台融合与可配置方案](/hub-v2/28-unified-dashboard-design)。

## 4. 当前实现注意点

- 报销接口统一挂在 `/api/admin/reimbursements`。
- 审批模板默认读取 `expense_default`。
- 新建表单未保存前可使用 `POST /api/admin/reimbursements/approval-preview` 预览审批流程。
- 报销附件使用 `reimbursements/attachment` 语义，上传生命周期仍参考 [19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)。
- 财务中心菜单当前包含报销管理、我的报销、公告管理；首页展示由统一工作台策略决定。

## 5. 后续维护规则

- 修改报销接口时，同步更新 [26 报销模块 API 联调说明](/hub-v2/26-reimbursement-api-contract)。
- 修改审批人解析、角色权限或组织字段时，同步更新 [25 授权底座方案](/hub-v2/25-authorization-foundation-design) 与 [20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)。
- 修改首页卡片、菜单入口或权限显示策略时，同步更新 [28 单工作台融合与可配置方案](/hub-v2/28-unified-dashboard-design)。
