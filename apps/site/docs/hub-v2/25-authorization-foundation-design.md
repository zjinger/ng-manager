# hub-v2 角色/权限/用户一体化与报销系统授权底座方案

> 来源：由 `apps/hub-v2/server/docs/authorization-foundation-design.md` 迁入站点文档。本文作为财务与审批域的授权底座说明，配合 [23 财务与审批总览](/hub-v2/23-finance-approval-overview) 阅读。

## 1. 目标

第一阶段只建设“授权底座”，不建设报销单、审批实例、付款、预算、对账等财务明细业务。目标是把当前分散的：

1. `admin_accounts.role`
2. `system_roles/system_permissions`
3. `user_departments`
4. 旧 `finance_roles`

收敛成一套可支撑后续报销系统的统一授权模型。

本阶段最终要解决两件事：

1. 平台后台权限、财务业务权限、审批资格不再各自分散建模。
2. 后续报销审批能同时基于“组织关系”和“业务授权”解析审批人，而不是再单独补一套角色表。

## 2. 本次明确约束

### 2.1 用户组织归属

1. `user_departments` 不再保留兼职部门语义。
2. 一个用户只保留一个主部门。
3. 后续报销归属、组织审批链都以单一主部门为准。

### 2.2 财务角色

1. `finance_roles`、`user_finance_roles` 不再保留。
2. 财务业务身份全部并入 `system_roles/system_permissions`。
3. 后续不再新增任何围绕 `finance_roles` 的接口或页面。

### 2.3 审批流方向

1. 审批链采用“组织关系 + 业务授权”并列建模。
2. 审批流后续采用固定阶段模板。
3. 本阶段不建设通用流程引擎。

## 3. 现状问题

当前模型有几个核心问题：

1. `admin_accounts.role` 只够表达 `admin|user`，只能解决登录态和后台入口。
2. `system_roles/system_permissions` 现在主要服务 Admin Console 权限，业务域权限尚未进入主模型。
3. `user_departments` 当前允许 `primary|secondary`，与报销归属和审批链的单一组织语义冲突。
4. `finance_roles` 与系统角色并行，后续必然导致一人多套授权关系和接口重复。
5. 用户和部门主数据中还没有直属上级、部门负责人、财务审批责任人的稳定字段，审批链无法落地。

## 4. 目标模型

## 4.1 统一授权分层

后续统一分成三层：

1. 平台访问兼容层  
   保留 `admin_accounts.role`、JWT `role: admin|user`、`requireAdmin`、`adminGuard`，用于现有后台访问控制兼容。

2. 统一角色与权限层  
   使用 `system_roles`、`system_permissions`、`user_system_roles` 作为唯一角色授权模型。

3. 组织与审批关系层  
   使用用户、部门主数据中的审批关系字段，表达组织链上的审批资格来源。

这三层的职责边界：

1. `admin_accounts.role` 只负责“能否进入后台兼容层”。
2. `system_roles/system_permissions` 负责“具备什么业务能力”。
3. 用户/部门审批关系负责“审批链上谁有天然组织资格”。

## 4.2 组织关系与业务授权并列

报销审批人的来源分两类：

### 组织来源

1. 直属上级
2. 部门负责人
3. 部门链路

### 授权来源

1. 财务复核人
2. 出纳
3. 报销管理员
4. 例外审批人

后续审批解析必须同时支持这两类来源，不能只靠部门树，也不能只靠角色表。

## 5. 数据模型调整

## 5.1 `user_departments`

目标：

1. 只表达用户的单一主部门归属。
2. 不再保留 `secondary` 兼职部门语义。
3. `role_code` 不再承载长期业务授权语义。

建议调整：

1. 每个用户最多一条 `user_departments` 记录。
2. `relation_type` 语义收敛为固定主部门；若物理字段短期保留，也只能存 `primary`。
3. 用户创建/编辑表单改为单部门选择，不再支持兼职部门。

## 5.2 `users`

建议新增审批关系字段：

1. `manager_user_id TEXT NULL`  
   直属上级用户。

2. `finance_approver_user_id TEXT NULL`  
   可选财务审批责任人，用于需要按用户显式指定财务审批人的场景。

这些字段只表达审批关系，不表达业务权限。

## 5.3 `departments`

建议新增：

1. `manager_user_id TEXT NULL`  
   部门负责人。

部门负责人是后续“部门负责人审批”阶段的组织来源之一。

## 5.4 `system_roles`

`system_roles` 继续作为唯一角色实体，建议增加角色用途标识：

1. `purpose_code`
2. `purpose_name`

建议用途分组：

1. `platform_admin` 平台管理角色
2. `business` 业务角色
3. `hybrid` 混合角色

这样角色管理页后续可以区分后台治理角色和报销业务角色。

## 5.5 `system_permissions`

在现有后台导航权限之外，补业务域权限命名空间。

建议新增至少以下权限码：

### 报销域

1. `expense.submit`
2. `expense.view.self`
3. `expense.report.view`
4. `expense.rule.manage`

### 审批域

1. `approval.department`
2. `approval.cross_department`

### 财务域

1. `finance.review`
2. `finance.cashier`

同时建议给权限补域标签：

1. `domain_code`
2. `domain_name`

建议最少分组：

1. `admin`
2. `expense`
3. `approval`
4. `finance`

## 5.6 删除旧财务角色模型

本阶段明确删除：

1. `finance_roles`
2. `user_finance_roles`
3. `/api/admin/finance-roles`
4. `/api/admin/users/:userId/finance-roles`
5. 前端围绕财务角色的 model/service/UI

后续财务业务授权全部由：

1. `system_roles`
2. `system_permissions`
3. `user_system_roles`

承载。

## 5.7 审批模板配置底座

本阶段不建设报销单和审批实例，但要预埋“固定阶段模板”配置模型。

建议新增：

### `approval_templates`

字段建议：

1. `id`
2. `code`
3. `name`
4. `description`
5. `status`
6. `created_at`
7. `updated_at`

### `approval_template_stages`

字段建议：

1. `id`
2. `template_id`
3. `stage_code`
4. `stage_name`
5. `stage_type`
6. `resolver_type`
7. `resolver_ref`
8. `sort`
9. `created_at`
10. `updated_at`

其中：

#### `stage_type`

固定阶段枚举建议为：

1. `direct_manager`
2. `department_manager`
3. `finance_review`
4. `cashier`
5. `special_authorizer`

#### `resolver_type`

审批人来源建议为：

1. `direct_manager`
2. `department_manager`
3. `department_chain`
4. `finance_approver`
5. `system_role`

说明：

1. `resolver_type` 表示“这一阶段通过什么来源解析审批人”。
2. 当 `resolver_type = system_role` 时，`resolver_ref` 存目标 `system_role.id`。
3. 其他 resolver 类型通常不需要 `resolver_ref`。

## 6. 后端接口规划

## 6.1 继续保留

继续保留：

1. `/api/admin/system-roles`
2. `/api/admin/system-permissions`
3. `/api/admin/system-roles/:roleId/permissions`
4. `/api/admin/system-roles/:roleId/users`

但返回结构建议逐步补充：

1. 角色用途标签
2. 权限域标签

## 6.2 用户与组织接口调整

### 用户

`/api/admin/users` 的创建、编辑、详情、列表返回增加：

1. 单一主部门
2. `managerUserId`
3. `financeApproverUserId`

### 部门

`/api/admin/departments` 的创建、编辑、详情返回增加：

1. `managerUserId`

## 6.3 删除旧财务角色接口

删除：

1. `GET /api/admin/finance-roles`
2. `POST /api/admin/finance-roles`
3. `PATCH /api/admin/finance-roles/:roleId`
4. `DELETE /api/admin/finance-roles/:roleId`
5. `GET /api/admin/users/:userId/finance-roles`
6. `POST /api/admin/users/:userId/finance-roles`
7. `DELETE /api/admin/users/:userId/finance-roles/:roleId`

## 6.4 审批模板接口

建议新增 admin 域接口：

1. `GET /api/admin/approval-templates`
2. `POST /api/admin/approval-templates`
3. `GET /api/admin/approval-templates/:templateId`
4. `PATCH /api/admin/approval-templates/:templateId`

第一阶段只做模板配置，不做流程实例化接口。

## 7. 前端影响范围

## 7.1 用户管理

用户管理表单需要从“主部门 + 兼职部门”调整为：

1. 主部门
2. 直属上级
3. 财务审批责任人

不再出现“兼职部门”输入。

## 7.2 组织管理

部门表单中的“部门负责人”改为真实字段，不再是占位文案。

## 7.3 角色管理 / 权限配置

角色管理与权限配置页继续基于 `system_roles/system_permissions`，但数据上要支持：

1. 角色用途
2. 权限域
3. 后台管理与报销业务共存

## 7.4 Admin 文案

所有还提到“财务角色”的 Admin 文案需要清理，避免继续暴露旧模型概念。

## 8. 迁移策略

## 8.1 用户部门收敛

若库内已有多部门数据，迁移时需要：

1. 每个用户保留一个主部门。
2. 如果已有 `primary`，优先保留该记录。
3. 如果没有 `primary`，按既定规则选择一条保留。
4. 其他兼职部门记录删除。

## 8.2 财务角色清理

若库内存在旧财务角色数据，迁移目标不是继续保留旧表，而是：

1. 将必要的财务业务语义映射为新的 `system_roles`
2. 将能力映射为新的 `system_permissions`
3. 将用户授权关系映射到 `user_system_roles`
4. 完成后删除旧表

如果当前运行库里并没有实际落地旧表，可以直接移除相关后端代码与接口。

## 8.3 兼容层保留

本阶段不替换：

1. `admin_accounts.role`
2. JWT `role: admin|user`
3. `requireAdmin`
4. `adminGuard`

理由很直接：当前平台后台访问控制已经依赖这套逻辑，第一阶段先沉淀统一授权主数据，不在同一轮接管运行时入口。

## 9. 分阶段实施建议

## Phase 1A：模型收口

1. 删除 `finance_roles` 全链路
2. `user_departments` 收敛为单主部门
3. 用户/部门新增审批关系字段
4. `system_permissions` 扩展业务域权限
5. `system_roles/system_permissions` 增加用途/域标签

## Phase 1B：管理面改造

1. 用户管理表单改为单部门 + 审批关系字段
2. 部门表单接入部门负责人
3. 清理所有财务角色旧入口与旧文案

## Phase 1C：审批模板底座

1. 新增 `approval_templates` / `approval_template_stages`
2. 提供最小 admin 配置接口
3. 不做流程实例化，不做单据联动

## 10. 非目标

本阶段明确不做：

1. 报销单主表/明细表
2. 审批实例表、待办表、流转日志表
3. 通用流程引擎
4. 预算、付款、对账、凭证、科目
5. 多组织归属下的复杂审批优先级引擎
6. `adminGuard` 和 `requireAdmin` 的 RBAC 接管

## 11. 下一步落地顺序

建议严格按下面顺序实施，避免返工：

1. 先改 migration 和后端类型/接口
2. 再改用户管理和部门管理前端表单
3. 然后补审批模板模块
4. 最后再评估是否开始接报销单业务

这个顺序的核心原因是：审批模板和报销业务都依赖稳定的“用户 + 部门 + 角色 + 权限”主数据，如果先做业务表，后面一定会回头拆授权模型。
