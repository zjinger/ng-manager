# RD 权限矩阵（冻结版）

本文档用于冻结 `RD Drawer Detail` 的操作权限规则，作为服务端 policy、前端按钮可见性和测试用例的统一依据。

## 1. 角色定义

- `创建人`：`rd_items.creator_id`
- `执行人`：`rd_items.assignee_id`
- `项目管理员`：`project_members.role_code = project_admin` 或 `is_owner = 1`

说明：

- 全局 `admin` 在 RD 业务操作中不默认旁路，需遵循同一矩阵（阶段管理除外）。

## 2. 状态流转

```text
todo --start--> doing
doing --block--> blocked
blocked --resume--> doing
doing --complete--> done
```

## 3. 操作权限矩阵

| 操作 | 当前状态 | 允许角色 |
| --- | --- | --- |
| 开始（start） | todo | 执行人 |
| 阻塞（block） | doing | 执行人、项目管理员 |
| 继续（resume） | blocked | 执行人、项目管理员 |
| 完成（complete） | doing | 执行人 |
| 调整进度（update progress） | 非 closed | 执行人 |
| 编辑基本信息（标题/描述） | 任意 | 创建人、执行人、项目管理员 |
| 删除（delete） | 任意 | 创建人、项目管理员（需二次确认） |

补充规则：

- 当执行人将研发项进度更新到 `100%` 且当前状态为 `doing` 时，系统按 `complete` 动作处理（等同点击“完成”）。

## 4. 前后端一致性要求

- 服务端：所有动作必须在 `rd.service.ts` 中做强校验，前端隐藏按钮不作为权限依据。
- 前端：Drawer 仅展示当前用户可操作按钮，避免触发无意义 403。
- 无验收按钮，执行人点击“完成”即结束任务。
- 删除按钮：必须带二次确认弹层。

## 5. 测试检查清单

- 执行人可 `start/complete/progress`，非执行人不可。
- 项目管理员可 `block/resume/delete`，不可直接 `complete`。
- 创建人可编辑基本信息与删除，即使不是执行人。
- 所有被拒绝动作返回 403 且错误码稳定（`RD_*_FORBIDDEN`）。
