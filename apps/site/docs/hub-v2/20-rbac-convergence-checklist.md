# Hub-v2 RBAC 收口迁移清单（users / admin_accounts / user_system_roles）

## 1. 目标口径

- `users`：唯一人员主数据（组织、职务、直属上级）
- `admin_accounts`：仅登录账号与认证状态（必须绑定 `user_id`）
- `user_system_roles`：唯一授权来源
- `manager_user_id`：保留（审批链组织关系）
- `finance_approver_user_id`：下线（不再作为授权来源）

---

## 2. 分阶段实施

## Phase A（当前阶段，低风险收口）

### A1. 数据一致性（强制）

[x] 1. `admin_accounts.user_id` 全量补齐，禁止空值新增。  
[x] 2. 启动时执行一次“账号-用户绑定 + 平台角色同步”自愈。  
[x] 3. 增加巡检 SQL（发布前/日常巡检）：
   - 查空绑定账号
   - 查无角色用户
   - 查无平台角色用户（`super_admin/admin/member`）

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
[x] 3. 保留最小兼容映射脚本用于历史库修复（平台角色同步与巡检脚本保留）。

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

-- 3) 账号绑定 user 后，缺少平台角色（super_admin/admin/member）
SELECT a.id AS account_id, a.username, a.user_id, GROUP_CONCAT(sr.code) AS role_codes
FROM admin_accounts a
LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
LEFT JOIN system_roles sr ON sr.id = ur.role_id
WHERE a.user_id IS NOT NULL
GROUP BY a.id, a.username, a.user_id
HAVING SUM(CASE WHEN sr.code IN ('super_admin', 'admin', 'member') THEN 1 ELSE 0 END) = 0;
```

---

## 4. 回归验证清单

1. `/api/admin/auth/me` 返回：
   - `department`
   - `systemRoles`
   - `permissionCodes`
   - `titleCode/titleName`
2. 管理端路由无权限用户被拦截到 `/dashboard`。  
3. 页面按钮与菜单显隐与路由拦截一致。  
4. `admin` 与 `member` 默认权限符合预期：
   - `member` 无后台管理权限
   - `member` 有 `expense.submit`、`expense.view.self`

---

## 5. 实施原则

1. 未部署阶段优先“清理基线”，少打补丁迁移。  
2. 已部署后采用“增量迁移 + 自愈脚本 + 回归验证”策略。  
3. 任一阶段都不做“权限来源双写双读长期并存”。

---

## 6. 当前状态（2026-05-18，更新）

- 已完成
  - Phase A1：账号绑定自愈、角色同步、自检脚本。
  - Phase A2：前端指令/路由守卫基于 `permissionCodes`；后端已具备并落地 `requirePermission(...)`。
  - Phase A3：`finance_approver_user_id` 已停止前后端写入与展示（字段暂存仅保留历史）。
  - Phase B1：核心后台模块已从 `requireAdmin` 切到权限码校验（用户/组织/角色权限/系统设置/职务/审批模板/共享配置，以及公告/文档/版本发布的 global 分支）。
  - Phase B2：管理端入口、侧边栏菜单、关键按钮与登录跳转已按权限码控制。

- 结论
  - `admin_accounts.role` 已降级为登录分组字段，不再驱动 `user_system_roles` 自动同步；系统角色以显式 RBAC 绑定为准。
