# Issue 权限矩阵（v2）

> 目的：冻结 Issue 流程与权限口径，作为后续服务端/前端改写、联调与测试验收依据。  
> 范围：仅覆盖 Issue 模块（含认领、流转、协作、评论、附件、删除/归档策略）。

---

## 1. 角色定义

- `admin`：系统管理角色，不参与 Issue 业务流转；不因 `admin` 身份获得额外业务权限。
- `project_admin`：项目管理员（项目创建者或被授权管理员）。
- `reporter`：问题提报人。
- `assignee`：问题负责人（执行人）。
- `verifier`：验证人。
- `member`：普通项目成员（非上述角色时）。

说明：
- 同一用户可同时具备多个业务身份（如 `reporter + verifier`）。
- 本文“成员”默认前提：已通过项目访问校验（在项目可访问范围内）。
- 若系统管理员同时以项目成员身份参与项目，则按 `project_admin / reporter / assignee / verifier / member` 业务身份判定，而不是按 `admin` 身份判定。

---

## 2. 状态机（含认领）

状态：
- `open` 待处理
- `in_progress` 处理中
- `pending_update` 待提测
- `resolved` 待验证
- `verified` 已验证
- `reopened` 已重开
- `closed` 已关闭

动作与迁移：
- `claim`：`open|reopened|in_progress|pending_update -> 原状态`（仅变更负责人）
- `assign`：`open|in_progress|pending_update|reopened -> 原状态`（仅变更负责人）
- `start`：`open|reopened|pending_update -> in_progress`
- `wait_update`：`in_progress|reopened -> pending_update`
- `resolve`：`in_progress|pending_update|reopened -> resolved`
- `verify`：`resolved -> verified`
- `reopen`：`resolved|verified|closed -> reopened`
- `close`：`open|in_progress|pending_update|resolved|verified|reopened -> closed`
- `update`：允许在各可编辑状态下原状态更新

认领约束：
- 仅当 `assignee` 为空可认领。
- 认领后 `assignee = 当前用户`。

重新指派约束（提报人）：
- 未有负责人时，提报人可执行“指派”。
- 一旦已有负责人，仅当前负责人可执行“转派”；提报人不能再重新指派。

关闭约束（提报人）：
- 提报人可在未进入开始处理流程前关闭（`open/reopened`）。
- 提报人可在验证通过后关闭（`verified`）。

---

## 3. 操作权限矩阵（核心流转）

| 操作 | admin | project_admin | reporter | assignee | verifier | member |
|---|---|---|---|---|---|---|
| 创建 Issue | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 更新基础信息（标题/描述/优先级/模块等） | ⛔ | ⛔ | ✅ | ✅ | ✅ | ⛔ |
| 认领 Claim（仅未指派） | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 指派 / 转派 Assign | ⛔ | ✅（仅未指派） | ✅（仅未指派） | ✅（open/reopened/in_progress/pending_update，显示“转派”） | ⛔ | ⛔ |
| 开始处理 Start / 继续处理 | ⛔ | ⛔ | ⛔ | ✅（`open/reopened/pending_update`） | ⛔ | ⛔ |
| 标记待提测 Wait Update | ⛔ | ⛔ | ⛔ | ✅（`in_progress/reopened`） | ⛔ | ⛔ |
| 标记解决 Resolve | ⛔ | ⛔ | ⛔ | ✅（`in_progress/pending_update/reopened`） | ⛔ | ⛔ |
| 验证通过 Verify | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ⛔ |
| 重新打开 Reopen | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ⛔ |
| 关闭 Close | ⛔ | ⛔ | ✅（仅 open/reopened/verified） | ⛔ | ⛔ | ⛔ |

说明：
- 上表是当前冻结口径，前后端后续改动均应以此为准。
- `admin` 列表示“仅凭 admin 身份”时的权限，不叠加任何业务身份。
- 若后续需要和 RD 权限风格统一，应先更新本文，再调整 `project_admin` 的管理动作边界。
- `close` 新增 reporter 条件：提报人仅在 `open/reopened/verified` 可关闭。
- `assign` 冻结规则分两类：未指派时由 `reporter/project_admin` 指派；已指派后仅 `assignee` 可转派。
- `wait_update` 用于“代码已提交，等待测试验证”的中间态，便于负责人从“我的问题”中单独筛选。

---

## 4. 协作域权限矩阵

| 操作 | admin | project_admin | reporter | assignee | verifier | member |
|---|---|---|---|---|---|---|
| 评论 | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| @成员通知 | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 添加协作人 | ⛔ | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ⛔ | ⛔ |
| 移除协作人 | ⛔ | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ✅（仅已存在负责人，且 open/in_progress/pending_update） | ⛔ | ⛔ |
| 上传附件 | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 删除附件 | ⛔ | ✅ | ✅（仅本人上传） | ✅（仅本人上传） | ✅（仅本人上传） | ✅（仅本人上传） |

说明：
- 评论/协作/附件当前冻结规则主要以“项目可访问”作为准入。
- `admin` 不作为 Issue 业务参与角色；若管理员同时具备项目业务身份，仍按对应业务身份判断。
- 协作人管理额外前提：Issue 必须已存在负责人；未指派前不能添加或移除协作人。
- 删除附件额外前提：仅项目管理员或该附件上传者本人可删除。
- 若后续要收紧，可增加“仅 reporter/assignee/project_admin 可移除协作人或附件”的细则。

---

## 5. 前后端实现锚点

服务端：
- `apps/hub-v2/server/src/modules/issue/issue.policy.ts`
- `apps/hub-v2/server/src/modules/issue/issue-state-machine.ts`
- `apps/hub-v2/server/src/modules/issue/issue.service.ts`
- `apps/hub-v2/server/src/modules/issue/issue.routes.ts`

前端：
- `apps/hub-v2/web/src/app/features/issues/services/issue-permission.service.ts`
- `apps/hub-v2/web/src/app/features/issues/store/issue-detail.store.ts`
- `apps/hub-v2/web/src/app/features/issues/components/issue-detail-header/*`

---

## 6. 本阶段冻结结论

- 已补齐认领动作：任何项目成员均可认领“未指派”的 Issue。
- 认领不改变状态，只变更负责人，并写入日志。
- 已新增 `pending_update`（待提测）状态，位于 `in_progress` 与 `resolved` 之间。
- 负责人可先标记“待提测”，待测试验证就绪后再“继续处理”或直接“标记解决”。
- 后续所有权限改写，先以本文为基线；若变更，先改本文再改代码。
