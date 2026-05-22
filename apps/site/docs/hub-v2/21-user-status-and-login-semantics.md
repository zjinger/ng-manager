# 用户状态与后台登录语义

本文档收口 Hub V2 用户管理中的两个容易混淆的字段：`users.status` 与 `admin_accounts.status`。两者都可能表现为“启用/停用”，但职责不同。

---

## 1. 核心口径

| 概念 | 字段 | 语义 | 影响范围 |
| --- | --- | --- | --- |
| 人员状态 | `users.status` | 用户作为组织人员主数据是否有效 | 用户列表、通讯录、部门关系、项目协作、报销归属、审批候选人 |
| 后台登录 | `admin_accounts.status`，前端展示为 `loginEnabled` | 该人员是否允许通过账号登录 Hub V2 | 登录、JWT 会话、个人接口、系统访问 |

规则：

- `users.status = inactive` 表示人员停用，是更高层的主数据状态。
- 人员停用后必须视为不可登录，即使历史上 `admin_accounts.status = active`，接口也按不可登录处理。
- `loginEnabled` 只表达“人员处于 active 时是否允许登录”，不能反向让停用人员继续登录。
- `admin_accounts.role` 只保留为登录兼容层，不作为 RBAC 权限来源；业务权限以 `system_roles` / `system_permissions` 为准。

---

## 2. 状态组合

| 人员状态 | 后台登录账号状态 | 前端展示 | 是否可登录 | 说明 |
| --- | --- | --- | --- | --- |
| `active` | `active` | 人员状态启用，后台登录开启 | 是 | 正常在职且允许登录 |
| `active` | `inactive` 或无账号 | 人员状态启用，后台登录关闭 | 否 | 人员仍有效，但不允许登录 |
| `inactive` | 任意 | 人员状态停用，后台登录关闭 | 否 | 人员停用强制覆盖登录状态 |

无效组合处理：

- 如果历史数据出现 `users.status = inactive` 且 `admin_accounts.status = active`，读取用户列表和详情时 `loginEnabled` 仍返回 `false`。
- 认证查询会把绑定停用人员的账号视为 `inactive`，旧 JWT 后续请求会降级为未登录。

---

## 3. 写入规则

用户创建：

- 新建用户默认 `users.status = active`。
- `loginEnabled` 默认为开启，可在创建时关闭。
- 创建时不会产生“停用人员但允许登录”的状态。

用户编辑：

- 将人员状态改为 `inactive` 时，后台登录必须同步关闭。
- 停用人员的登录开关在前端禁用并展示为关闭。
- 将人员状态从 `inactive` 改回 `active` 时，不应自动恢复登录；需要管理员显式开启后台登录。
- 仅关闭后台登录时，不影响人员状态，用户仍作为有效人员参与通讯录、项目和组织关系。

密码重置：

- 密码重置只处理登录凭据，不改变人员状态。
- 若停用人员没有登录账号，重置密码创建的账号也必须保持不可登录。

---

## 4. API 表达

用户列表和详情继续返回两个字段：

```json
{
  "status": "active",
  "loginEnabled": true,
  "lastLoginAt": "2026-05-22T09:30:00.000Z"
}
```

字段含义：

- `status`：人员状态，来自 `users.status`。
- `loginEnabled`：按 `users.status` 与 `admin_accounts.status` 归一后的可登录状态。
- `lastLoginAt`：后台账号最后一次成功登录时间；无登录账号或从未登录时为 `null`。

认证接口：

- `/api/admin/auth/login` 只允许人员有效且后台登录开启的账号登录。
- `/api/admin/auth/me` 在会话绑定账号或人员停用后返回未授权。
- 普通 HTTP 请求解析 JWT 时会重新校验账号有效性，避免停用后旧会话继续访问。
- 登录页“记住登录状态”只控制 Cookie 是否持久化：
  - 勾选时设置持久 Cookie，最长有效期与服务端 `AUTH_TOKEN_EXPIRES_IN` 一致，当前默认 `7d`。
  - 不勾选时设置浏览器会话 Cookie，关闭浏览器后由浏览器清理。
  - 无论是否勾选，JWT 自身过期时间都以 `AUTH_TOKEN_EXPIRES_IN` 为准。

---

## 5. 前端展示

用户编辑弹窗中使用以下文案：

- “人员状态”：`active` 展示为“启用”，`inactive` 展示为“停用”
- “可登录后台”：只在人员状态为 `active` 时可编辑

当人员状态为 `inactive`：

- 登录开关展示为关闭；
- 登录开关不可编辑；
- 提交时强制 `loginEnabled = false`；
- 用户详情和列表仍可展示历史信息，但不应提供登录相关正向操作。

---

## 6. 安全锁定

用户详情中的“锁定”不在第一阶段实现，避免和“人员停用”“关闭后台登录”混用。

如果后续需要安全锁定，建议作为独立的账号安全能力建模，用于短期冻结异常账号：

- 新增账号锁定字段，例如 `locked_until`、`locked_reason`、`locked_by`、`locked_at`。
- 锁定不改变 `users.status`，不表达离职、停用或组织主数据状态。
- 锁定不删除角色和权限，只在登录和会话校验时阻断访问。
- 解锁后仍需同时满足 `users.status = active` 与 `admin_accounts.status = active` 才可登录。

当前可用操作边界：

- 临时禁止登录：关闭“可登录后台”。
- 人员离职或长期停用：设置“人员状态”为停用。
- 安全异常冻结：暂不提供入口，后续单独建设。

---

## 7. 员工类型

“员工类型”当前不接入用户编辑表单，避免出现不可保存的占位字段。

如果后续需要维护正式员工、试用、实习、外包、顾问等类型，应作为 HR 主数据字段处理：

- 建议字段：`users.employee_type_code`。
- 建议字典：`system_employee_types`，包含 `code`、`name`、`status`、`sort`、`remark`。
- 员工类型只表达人员属性，不承载权限。
- 权限仍由 `system_roles` / `system_permissions` 表达。
- 组织职务继续使用 `organization_titles`，不要和员工类型混用。
- 项目角色/项目分工使用 `project_titles` 与 `project_members.role_code`，不要和组织职务混用。
- 用户主数据可维护 `default_project_title_code` 作为“默认项目职能”，仅用于添加项目成员时自动带出建议角色；项目内真实角色仍以 `project_members.role_code` 为准，项目管理员可在添加成员时调整。

---

## 8. 与 RBAC 的关系

本规则只解决“人是否有效”和“账号是否可登录”，不表达业务权限。

- 人员是否可登录：看 `users.status` + `admin_accounts.status`。
- 登录后能看什么、做什么：看 `system_roles` + `system_permissions`。
- 项目内 CRUD：继续结合项目 owner、项目管理员、项目成员关系与项目级权限。

因此，一个用户可以是有效人员但不可登录；也可以可登录但没有某些业务权限。停用人员则无论拥有多少角色和权限，都不能继续登录和访问系统。
