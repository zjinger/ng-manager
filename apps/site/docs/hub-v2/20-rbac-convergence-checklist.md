# Hub-v2 RBAC 收口迁移清单（users / admin_accounts / user_system_roles）

## 1. 目标口径

- `users`：唯一人员主数据（组织、职务、直属上级）
- `users.default_project_title_code`：默认项目职能，仅作为添加项目成员时的建议值
- `admin_accounts`：仅登录账号与认证状态（必须绑定 `user_id`）
- `user_system_roles`：唯一授权来源
- `manager_user_id`：保留（审批链组织关系）
- `finance_approver_user_id`：下线（不再作为授权来源）
- 默认项目职能不承载权限；项目内真实治理仍以 owner、`project_members.role_code` 与 `project.*` 权限联合判定

---

## 2. 分阶段实施

## Phase A（当前阶段，低风险收口）

### A1. 数据一致性（强制）

[x] 1. `admin_accounts.user_id` 全量补齐，禁止空值新增。  
[x] 2. 启动时执行一次“账号-用户绑定 + 初始化超管角色”自愈。  
[x] 3. 增加巡检 SQL（发布前/日常巡检）：
   - 查空绑定账号
   - 查无角色用户
   - 查初始化超管是否具备 `super_admin`

### A2. 授权来源收口

[x] 1. 前端按钮/菜单：统一 `permissionCodes`。  
[x] 2. 前端路由：统一 `permissionGuard`。  
[x] 3. 后端管理接口：已落地 RBAC 权限码校验能力并完成核心模块切换。

### A3. 字段语义冻结

[x] 1. `users.finance_approver_user_id`：
   - 已停止前端录入与展示
   - 已停止后端业务判断使用
   - 已进入基线清理（41-49 重建后不再保留该列）
[x] 2. `users.manager_user_id`：保留并作为审批链组织来源字段。

---

## Phase B（权限链路切换）

### B1. 后端鉴权从 `role` 切到权限码

[x] 1. 增加统一鉴权工具（`requirePermission(...)`）。  
[x] 2. 新接口直接使用权限码校验。  
[x] 3. 旧接口已完成核心模块替换：
   - 用户管理
   - 组织管理
   - 角色权限管理
   - 系统设置/审计

### B2. 前端入口按权限码控制

[x] 1. 导航配置改为基于权限码显隐。  
[x] 2. 禁止仅用 `role === 'admin'` 控制页面可见性。  
[x] 3. `/auth/me` 作为单一权限快照来源。

---

## Phase C（兼容层移除）

### C1. 数据库迁移

[x] 1. 删除 `users.finance_approver_user_id` 列（通过 41-49 基线重建收口）。  
[x] 2. 评估并弱化 `admin_accounts.role`：
   - 作为登录分组保留（可选）
   - 或替换为 `account_type`，不承载授权语义

### C2. 代码清理

[x] 1. 删除所有基于 `finance_approver_user_id` 的残留逻辑。  
[x] 2. 删除基于 `admin_accounts.role` 的授权判断逻辑。  
[x] 3. 保留巡检脚本用于历史库修复；`admin_accounts.role` 不再自动映射平台角色。

---

## 3. 推荐巡检 SQL（收口后口径）

```sql
-- 1) admin 账号未绑定 user
SELECT id, username
FROM admin_accounts
WHERE user_id IS NULL OR TRIM(user_id) = '';

-- 2) 账号绑定 user 后，用户没有任何系统角色
SELECT a.id AS account_id, a.username, a.user_id
FROM admin_accounts a
LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
WHERE a.user_id IS NOT NULL
GROUP BY a.id, a.username, a.user_id
HAVING COUNT(ur.role_id) = 0;

-- 3) 初始化管理员是否具备 super_admin
SELECT a.id AS account_id, a.username, a.user_id, GROUP_CONCAT(sr.code) AS role_codes
FROM admin_accounts a
LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
LEFT JOIN system_roles sr ON sr.id = ur.role_id
WHERE a.username = :INIT_ADMIN_USERNAME AND a.user_id IS NOT NULL
GROUP BY a.id, a.username, a.user_id
HAVING SUM(CASE WHEN sr.code = 'super_admin' THEN 1 ELSE 0 END) = 0;
```

---

## 4. 回归验证清单

1. `/api/admin/auth/me` 返回：
   - `department`
   - `systemRoles`
   - `permissionCodes`
   - `organizationTitleCode/organizationTitleName`
2. 管理端路由无权限用户被拦截到 `/dashboard`。  
3. 页面按钮与菜单显隐与路由拦截一致。  
4. `admin` 与 `member` 默认权限符合预期：
   - `member` 无后台管理权限
   - `member` 有 `expense.submit`、`expense.view.self`

---

## 5. 当前 RBAC 基线口径

### 5.1 内置角色

当前内置角色按小团队使用场景收口为：

| 角色编码 | 角色名称 | 默认职责 |
| --- | --- | --- |
| `super_admin` | 超级管理员 | 系统全部权限，唯一不可修改的内置角色 |
| `admin` | 管理员 | 后台管理基础能力，可由具备角色管理权限的管理员调整权限与成员 |
| `member` | 成员 | 普通员工基础角色，可提交并查看本人报销，可使用项目基础能力 |
| `expense_manager` | 报销管理员 | 报销审核管理、报销规则配置、报表查看 |
| `finance` | 财务 | 个人报销提交、本人报销查看、报表查看、财务复核、出纳处理 |

已移除或不再使用：

- `expense_employee`：报销员工角色已并入 `member`。
- `finance_reviewer` / `finance_cashier`：财务复核与出纳角色已合并为 `finance`。

### 5.2 默认权限

`member` 默认权限：

- `expense.submit`
- `expense.view.self`
- `project.manage`

`expense_manager` 默认权限：

- `expense.submit`
- `expense.view.self`
- `expense.report.view`
- `expense.review.manage`
- `expense.rule.manage`

`finance` 默认权限：

- `expense.submit`
- `expense.view.self`
- `expense.report.view`
- `finance.review`
- `finance.cashier`

项目权限当前基线：

- `project.manage`：普通项目基础能力，包括创建项目；创建后的维护仍按 owner/project_admin/project.manage.all 联合判定。
- `project.read.all`：查看全部项目。
- `project.manage.all`：管理全部项目。
- `project.archive`：归档项目。
- `project.owner.transfer`：转移项目 owner。

已删除或不再使用：

- `project.create`：由 `project.manage` 承担创建入口判断。
- `admin.projects.manage`：不再作为项目治理主权限，项目治理归入 `project.*` 权限域。

### 5.3 报销权限边界

- `expense.review.manage`：报销审核/审批管理能力。
- `expense.rule.manage`：报销规则、审批模板、报销公告等规则配置能力。
- `finance.review`：财务复核阶段处理能力。
- `finance.cashier`：出纳付款阶段处理能力。

报销审批链继续按“组织关系 + 业务授权”并列解析：

- 组织关系：直属上级、部门负责人。
- 业务授权：`expense.review.manage`、`finance.review`、`finance.cashier` 等角色权限。

### 5.4 内置角色修改规则

- `super_admin`：不可修改基本信息、权限、成员。
- 其他内置角色：可由具备角色管理权限的管理员调整基本信息、权限和成员。
- 内置角色仍不允许删除，避免破坏系统基线角色。

---

## 6. 实施原则

1. 未部署阶段优先“清理基线”，少打补丁迁移。  
2. 已部署后采用“增量迁移 + 自愈脚本 + 回归验证”策略。  
3. 任一阶段都不做“权限来源双写双读长期并存”。

---

## 7. 当前状态（2026-05-21，更新）

- 已完成
  - Phase A1：账号绑定自愈、角色同步、自检脚本。
  - Phase A2：前端指令/路由守卫基于 `permissionCodes`；后端已具备并落地 `requirePermission(...)`。
  - Phase A3：`finance_approver_user_id` 已停止前后端写入与展示（字段暂存仅保留历史）。
  - Phase B1：核心后台模块已从 `requireAdmin` 切到权限码校验（用户/组织/角色权限/系统设置/职务/审批模板/共享配置，以及公告/文档/版本发布的 global 分支）。
  - Phase B2：管理端入口、侧边栏菜单、关键按钮与登录跳转已按权限码控制。
  - RBAC 基线角色已收口：移除报销员工角色，财务复核/出纳合并为 `finance`，项目创建入口统一为 `project.manage`。

- 结论
  - `admin_accounts.role` 已降级为登录分组字段，不再驱动 `user_system_roles` 自动同步；系统角色以显式 RBAC 绑定为准。
  - 开发期重置/种子脚本仅允许在非生产环境执行；正式环境禁止运行 `db:seed`、`db:reset:*`、`db:reseed:user-departments` 这类会写入演示数据或重建授权数据的脚本。
