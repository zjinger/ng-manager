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

1. `admin_accounts.user_id` 全量补齐，禁止空值新增。  
2. 启动时执行一次“账号-用户绑定 + 平台角色同步”自愈（已落地）。  
3. 增加巡检 SQL（发布前/日常巡检）：
   - 查空绑定账号
   - 查无角色用户
   - 查 `admin_accounts.role` 与 `user_system_roles` 不一致

### A2. 授权来源收口

1. 前端按钮/菜单：统一 `permissionCodes`。  
2. 前端路由：统一 `permissionGuard`。  
3. 后端管理接口：保持 `requireAdmin` 兼容，同时新增 RBAC 权限码校验能力（先灰度，不一次切换全部接口）。

### A3. 字段语义冻结

1. `users.finance_approver_user_id`：
   - 停止前端录入与展示（已开始执行）
   - 停止后端业务判断使用
   - 仅保留存量数据，不再写入
2. `users.manager_user_id`：保留并作为审批链组织来源字段。

---

## Phase B（权限链路切换）

### B1. 后端鉴权从 `role` 切到权限码

1. 增加统一鉴权工具（示例：`requirePermission('admin.users.manage')`）。  
2. 新接口直接使用权限码校验。  
3. 旧接口逐步替换 `requireAdmin`，按模块分批切换：
   - 用户管理
   - 组织管理
   - 角色权限管理
   - 系统设置/审计

### B2. 前端入口按权限码控制

1. 导航配置改为基于权限码显隐。  
2. 禁止仅用 `role === 'admin'` 控制页面可见性。  
3. `/auth/me` 作为单一权限快照来源。

---

## Phase C（兼容层移除）

### C1. 数据库迁移

1. 删除 `users.finance_approver_user_id` 列。  
2. 评估并弱化 `admin_accounts.role`：
   - 作为登录分组保留（可选）
   - 或替换为 `account_type`，不承载授权语义

### C2. 代码清理

1. 删除所有基于 `finance_approver_user_id` 的残留逻辑。  
2. 删除基于 `admin_accounts.role` 的授权判断逻辑。  
3. 保留最小兼容映射脚本用于历史库修复。

---

## 3. 推荐巡检 SQL

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

-- 3) legacy role 与平台角色不一致
SELECT a.id, a.username, a.role AS legacy_role, GROUP_CONCAT(r.code) AS rbac_roles
FROM admin_accounts a
LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
LEFT JOIN system_roles r ON r.id = ur.role_id
GROUP BY a.id, a.username, a.role;
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
