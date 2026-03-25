# Hub v1 -> v2 数据迁移映射清单

最后更新：2026-03-23

## 1. 文档目的

本文档用于明确 `apps/hub` 到 `apps/hub-v2` 的数据迁移口径，重点解决：

- 哪些表是一对一迁移
- 哪些表需要结构重组
- 哪些字段需要状态映射或默认值补齐
- 哪些模块应该先迁，哪些模块应延后
- 迁移脚本的输入、输出和校验口径

本文档是后续迁移脚本和切流演练的基线，不是说明性文档。

---

## 2. 总体迁移策略

推荐采用：

- `v1 SQLite` 作为源库
- `v2 SQLite` 作为目标库
- 使用一次性导入脚本做 `v1 -> v2`
- 导入脚本按业务域分批执行
- 每批导入都必须先做数量校验，再做抽样校验

不建议：

- 让 `hub-v2` 直接读 `hub` 的数据库
- 在切换阶段做双系统双写
- 未完成模块迁移前整体切站

推荐顺序：

1. `users / admin_accounts`
2. `projects / project_members`
3. `announcements / documents / releases / shared_configs`
4. `issues / issue_comments / issue_attachments / issue_participants / issue_logs`
5. `rd_stages / rd_items / rd_logs`
6. `dashboard_preferences`

---

## 3. 迁移脚本建议结构

建议放在：

- `apps/hub-v2/server/src/db/migrate-from-v1.ts`
- `apps/hub-v2/server/src/db/migrate-from-v1.mapping.ts`
- `apps/hub-v2/server/src/db/migrate-from-v1.verify.ts`

建议支持这些参数：

- `--source <v1 db path>`
- `--target <v2 db path>`
- `--module users|projects|content|issues|rd|dashboard|all`
- `--dry-run`
- `--reset-target`

脚本必须满足：

- 幂等
- 可重复执行
- 可按模块单独运行
- 每模块输出 `migrated / skipped / conflicted`

---

## 4. 模块级映射总览

| v1 模块 | v1 表 | v2 表 | 类型 |
|---|---|---|---|
| 账号与用户 | `users` | `users` | 近似一对一 |
| 账号与用户 | `admin_users` | `admin_accounts` | 一对一改名 |
| 项目 | `projects` | `projects` | 一对一 |
| 项目成员 | `project_members` + `project_member_roles` | `project_members` | 聚合重组 |
| 公告 | `announcements` | `announcements` | 一对一 |
| 公告已读 | `announcement_reads` | `announcement_reads` | 基本一对一 |
| 文档 | `documents` | `documents` | 基本一对一 |
| 发布 | `releases` | `releases` | 基本一对一 |
| 配置中心 | `shared_config` | `shared_configs` | 一对一改名 |
| 上传 | `uploads` | `uploads` | 一对一 |
| Issue | `issues` | `issues` | 基本一对一 |
| Issue 评论 | `issue_comments` | `issue_comments` | 一对一 |
| Issue 附件 | `issue_attachments` | `issue_attachments` | 一对一 |
| Issue 协作人 | `issue_participants` | `issue_participants` | 一对一 |
| Issue 日志 | `issue_action_logs` | `issue_logs` | 一对一改名 |
| RD | `rd_stages` | `rd_stages` | 一对一 |
| RD | `rd_items` | `rd_items` | 一对一 |
| RD 日志 | `rd_logs` | `rd_logs` | 基本一对一 |
| Dashboard 偏好 | `dashboard_preferences` | `dashboard_preferences` | 一对一 |

不在 v2 第一阶段迁移范围内：

- `feedbacks`
- `project_modules`
- `project_environments`
- `project_versions`

这些表建议先不导入，后续作为扩展功能单独设计。

---

## 5. 账号与用户映射

### 5.1 `users -> users`

| v1 `users` | v2 `users` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `username` | `username` | 直接保留 |
| `display_name` | `display_name` | 直接保留 |
| `email` | `email` | 直接保留 |
| `mobile` | `mobile` | 直接保留 |
| `title_code` | `title_code` | 直接保留 |
| `status` | `status` | 直接保留 |
| `source` | `source` | 直接保留 |
| `remark` | `remark` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 5.2 `admin_users -> admin_accounts`

| v1 `admin_users` | v2 `admin_accounts` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `user_id` | `user_id` | 直接保留 |
| `username` | `username` | 直接保留 |
| `password_hash` | `password_hash` | 直接保留 |
| `nickname` | `nickname` | 直接保留 |
| `avatar_upload_id` | `avatar_upload_id` | 直接保留 |
| `role` | `role` | 直接保留 |
| `status` | `status` | 直接保留 |
| `must_change_password` | `must_change_password` | 直接保留 |
| `last_login_at` | `last_login_at` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 5.3 迁移校验

- `users.username` 唯一
- `admin_accounts.username` 唯一
- 所有 `admin_accounts.user_id` 若不为空，必须能在 `users.id` 中找到

---

## 6. 项目与成员映射

### 6.1 `projects -> projects`

| v1 `projects` | v2 `projects` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `project_key` | `project_key` | 直接保留 |
| `name` | `name` | 直接保留 |
| `description` | `description` | 直接保留 |
| `icon` | `icon` | 直接保留 |
| `status` | `status` | 直接保留 |
| `visibility` | `visibility` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 6.2 `project_members + project_member_roles -> project_members`

这是第一处需要重组的地方。

v1：

- `project_members` 只保存成员关系
- `project_member_roles` 单独保存多角色

v2：

- `project_members` 直接保存单个 `role_code`
- 同时带 `is_owner`

建议迁移规则：

1. 先按 `project_members` 建基础成员记录
2. 再读取该成员在 `project_member_roles` 中的所有角色
3. 选一个主角色映射到 `role_code`
4. 若角色集合中包含 `project_admin`，则：
   - `role_code = 'owner'`
   - `is_owner = 1`
5. 若无 `project_admin`，按优先级映射主角色

推荐优先级：

1. `project_admin -> owner`
2. `product -> manager`
3. `ui -> member`
4. `frontend_dev -> member`
5. `backend_dev -> member`
6. `qa -> tester`
7. `ops -> viewer`

字段映射：

| v1 | v2 | 规则 |
|---|---|---|
| `project_members.id` | `project_members.id` | 可直接保留 |
| `project_id` | `project_id` | 直接保留 |
| `user_id` | `user_id` | 直接保留 |
| `display_name` | `display_name` | 直接保留 |
| `joined_at` | `joined_at` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |
| `project_member_roles.role` | `role_code` | 需映射 |
| `project_member_roles.role` | `is_owner` | `project_admin => 1` |

### 6.3 暂不迁移项

以下 v1 项目级主数据在 v2 当前版本没有对应表：

- `project_modules`
- `project_environments`
- `project_versions`

处理建议：

- 不写入 v2 正式表
- 先导出为 JSON 归档文件
- 后续在 v2 增加项目扩展主数据模块后再导入

---

## 7. 内容域映射

### 7.1 `announcements -> announcements`

字段完全兼容，直接保留：

- `id`
- `project_id`
- `title`
- `summary`
- `content_md`
- `scope`
- `pinned`
- `status`
- `publish_at`
- `expire_at`
- `created_by`
- `created_at`
- `updated_at`

### 7.2 `announcement_reads -> announcement_reads`

字段兼容，直接保留：

- `id`
- `announcement_id`
- `user_id`
- `read_version`
- `read_at`

`created_at / updated_at`：

- v2 也保留，直接写入

### 7.3 `documents -> documents`

| v1 `documents` | v2 `documents` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `project_id` | `project_id` | 直接保留 |
| `slug` | `slug` | 直接保留 |
| `title` | `title` | 直接保留 |
| `category` | `category` | 直接保留 |
| `summary` | `summary` | 直接保留 |
| `content_md` | `content_md` | 直接保留 |
| `status` | `status` | 直接保留 |
| `version` | `version` | 写入 `version` |
| `created_by` | `created_by` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 7.4 `releases -> releases`

| v1 `releases` | v2 `releases` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `project_id` | `project_id` | 直接保留 |
| `channel` | `channel` | 直接保留 |
| `version` | `version` | 直接保留 |
| `title` | `title` | 直接保留 |
| `notes` | `notes` | 直接保留 |
| `download_url` | `download_url` | 直接保留 |
| `status` | `status` | 直接保留 |
| `published_at` | `published_at` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 7.5 `shared_config -> shared_configs`

仅表名变化。

| v1 `shared_config` | v2 `shared_configs` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `project_id` | `project_id` | 直接保留 |
| `scope` | `scope` | 直接保留 |
| `config_key` | `config_key` | 直接保留 |
| `config_name` | `config_name` | 直接保留 |
| `category` | `category` | 直接保留 |
| `value_type` | `value_type` | 直接保留 |
| `config_value` | `config_value` | 直接保留 |
| `description` | `description` | 直接保留 |
| `is_encrypted` | `is_encrypted` | 直接保留 |
| `priority` | `priority` | 直接保留 |
| `status` | `status` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

---

## 8. 上传映射

### 8.1 `uploads -> uploads`

字段兼容，直接保留：

- `id`
- `bucket`
- `category`
- `file_name`
- `original_name`
- `file_ext`
- `mime_type`
- `file_size`
- `checksum`
- `storage_provider`
- `storage_path`
- `visibility`
- `status`
- `uploader_id`
- `uploader_name`
- `created_at`
- `updated_at`

校验重点：

- `storage_path` 在部署目录仍然可访问
- 引用该上传的 `issue_attachments` 能够找到目标记录

---

## 9. Issue 域映射

### 9.1 `issues -> issues`

v2 增加了 `verifier_id / verifier_name / verified_at`。  
v1 中这些字段是在 `0011_project_members_and_issue_verifier.sql` 后引入，迁移时必须确认源库已包含这些列。

字段映射：

| v1 `issues` | v2 `issues` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `project_id` | `project_id` | 直接保留 |
| `issue_no` | `issue_no` | 直接保留 |
| `title` | `title` | 直接保留 |
| `description` | `description` | 直接保留 |
| `type` | `type` | 直接保留 |
| `status` | `status` | 直接保留 |
| `priority` | `priority` | 直接保留 |
| `reporter_id` | `reporter_id` | 直接保留 |
| `reporter_name` | `reporter_name` | 直接保留 |
| `assignee_id` | `assignee_id` | 直接保留 |
| `assignee_name` | `assignee_name` | 直接保留 |
| `verifier_id` | `verifier_id` | 直接保留 |
| `verifier_name` | `verifier_name` | 直接保留 |
| `reopen_count` | `reopen_count` | 直接保留 |
| `module_code` | `module_code` | 直接保留 |
| `version_code` | `version_code` | 直接保留 |
| `environment_code` | `environment_code` | 直接保留 |
| `resolution_summary` | `resolution_summary` | 直接保留 |
| `close_reason` | `close_reason` | 直接保留 |
| `close_remark` | `close_remark` | 直接保留 |
| `started_at` | `started_at` | 直接保留 |
| `resolved_at` | `resolved_at` | 直接保留 |
| `verified_at` | `verified_at` | 直接保留 |
| `closed_at` | `closed_at` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |
| `updated_at` | `updated_at` | 直接保留 |

### 9.2 `issue_comments -> issue_comments`

字段兼容，直接保留：

- `id`
- `issue_id`
- `author_id`
- `author_name`
- `content`
- `mentions_json`
- `created_at`
- `updated_at`

### 9.3 `issue_attachments -> issue_attachments`

字段兼容，直接保留：

- `id`
- `issue_id`
- `upload_id`
- `created_at`

### 9.4 `issue_participants -> issue_participants`

字段兼容，直接保留：

- `id`
- `issue_id`
- `user_id`
- `user_name`
- `created_at`

### 9.5 `issue_action_logs -> issue_logs`

仅表名变化。

| v1 `issue_action_logs` | v2 `issue_logs` | 规则 |
|---|---|---|
| `id` | `id` | 直接保留 |
| `issue_id` | `issue_id` | 直接保留 |
| `action_type` | `action_type` | 直接保留 |
| `from_status` | `from_status` | 直接保留 |
| `to_status` | `to_status` | 直接保留 |
| `operator_id` | `operator_id` | 直接保留 |
| `operator_name` | `operator_name` | 直接保留 |
| `summary` | `summary` | 直接保留 |
| `created_at` | `created_at` | 直接保留 |

---

## 10. RD 域映射

### 10.1 `rd_stages -> rd_stages`

字段兼容，直接保留：

- `id`
- `project_id`
- `name`
- `sort`
- `enabled`
- `created_at`
- `updated_at`

### 10.2 `rd_items -> rd_items`

字段兼容，直接保留：

- `id`
- `project_id`
- `rd_no`
- `title`
- `description`
- `stage_id`
- `type`
- `status`
- `priority`
- `assignee_id`
- `assignee_name`
- `creator_id`
- `creator_name`
- `reviewer_id`
- `reviewer_name`
- `progress`
- `plan_start_at`
- `plan_end_at`
- `actual_start_at`
- `actual_end_at`
- `blocker_reason`
- `created_at`
- `updated_at`

### 10.3 `rd_logs -> rd_logs`

字段兼容，直接保留：

- `id`
- `project_id`
- `item_id`
- `action_type`
- `content`
- `operator_id`
- `operator_name`
- `created_at`

---

## 11. Dashboard 偏好映射

### 11.1 `dashboard_preferences -> dashboard_preferences`

字段兼容，直接保留：

- `id`
- `user_id`
- `stats_config_json`
- `created_at`
- `updated_at`

---

## 12. 状态与枚举映射

### 12.1 Issue 状态

当前 v1/v2 状态设计一致，可直接保留：

- `open`
- `in_progress`
- `resolved`
- `verified`
- `closed`
- `reopened`

### 12.2 Issue 优先级

直接保留：

- `critical`
- `high`
- `medium`
- `low`

### 12.3 RD 状态

当前 v1/v2 状态设计一致，可直接保留：

- `todo`
- `doing`
- `blocked`
- `done`
- `accepted`
- `closed`
- `canceled`

### 12.4 项目成员角色

这里必须映射，不可直接保留。

| v1 角色 | v2 `role_code` | 备注 |
|---|---|---|
| `project_admin` | `owner` | 同时 `is_owner = 1` |
| `product` | `manager` | 产品负责人归到管理角色 |
| `ui` | `member` | 统一归普通成员 |
| `frontend_dev` | `member` | 统一归普通成员 |
| `backend_dev` | `member` | 统一归普通成员 |
| `qa` | `tester` | 测试角色 |
| `ops` | `viewer` | 当前版本先降级成只读 |

---

## 13. 暂不迁移清单

以下对象建议不进入首轮正式导入：

### 13.1 `feedbacks`

原因：

- v2 当前没有对等模块
- 不影响主流程切换

建议：

- 单独导出为归档 JSON
- 后续等 v2 `feedback` 模块落地后再导入

### 13.2 `project_modules / project_environments / project_versions`

原因：

- v2 当前没有正式表承接
- 这些数据会影响 Issue 表单体验，但不阻塞主流程

建议：

- 先导出为项目级扩展 JSON
- 作为 v2 后续迭代导入

---

## 14. 迁移校验清单

### 14.1 数量校验

每次迁移后输出：

- `users`
- `admin_accounts`
- `projects`
- `project_members`
- `announcements`
- `documents`
- `releases`
- `shared_configs`
- `uploads`
- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_participants`
- `issue_logs`
- `rd_stages`
- `rd_items`
- `rd_logs`
- `dashboard_preferences`

### 14.2 外键校验

- `admin_accounts.user_id -> users.id`
- `project_members.user_id -> users.id`
- `issues.project_id -> projects.id`
- `issues.assignee_id / reporter_id / verifier_id -> users.id`
- `issue_attachments.upload_id -> uploads.id`
- `rd_items.stage_id -> rd_stages.id`

### 14.3 抽样校验

建议至少抽样：

- 20 条 Issue
- 10 条 RD
- 10 个项目成员关系
- 10 条公告已读记录

抽查内容：

- 主标题
- 状态
- 责任人
- 项目归属
- 评论数
- 日志数

---

## 15. 切流建议

建议不要在数据迁移完成后立即整站切换，而是按业务域切流。

推荐切流顺序：

1. `users / projects`
2. `content`
3. `issues`
4. `rd`
5. `dashboard / notifications`

规则：

- 已切流模块只允许 v2 写
- 未切流模块继续由 v1 写
- 迁移脚本在切流前重新执行一次增量导入

---

## 16. 下一步建议

基于这份映射清单，建议立刻补两项：

1. `09-migration-runbook.md`
   - 迁移步骤
   - 切流顺序
   - 回滚规则

2. `apps/hub-v2/server/src/db/migrate-from-v1.ts`
   - 先实现 `users / admin_accounts / projects / project_members`
   - 再逐步扩到 `content / issues / rd`
