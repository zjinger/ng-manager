# apps/hub-v2 数据库设计文档

最后更新：2026-03-20

## 1. 文档目的

本文档用于定义 `apps/hub-v2` 的数据库设计原则、核心表结构、迁移策略和数据映射规则。

本文档重点回答：

- v2 需要哪些核心表
- 表如何按业务域分组
- 哪些字段属于稳定主数据，哪些字段属于流程数据
- 索引、唯一约束、事务边界如何设计
- v1 到 v2 如何迁移

本文档是以下文档的配套展开：

1. [01-hub-redesign-implementation-plan.md](d:/ng-manager/apps/hub-v2/docs/01-hub-redesign-implementation-plan.md)
2. [02-architecture-design.md](d:/ng-manager/apps/hub-v2/docs/02-architecture-design.md)

---

## 2. 设计目标

数据库设计遵循以下目标：

1. 保持 SQLite 单库模式，降低部署复杂度
2. 优先支撑流程稳定性和数据一致性
3. 让表结构与业务域一致，避免边界混乱
4. 支持分阶段 migration 和双轨迁移
5. 为后续扩展保留空间，但不提前过度抽象

---

## 3. 数据分层

### 3.1 主数据

主数据是其他业务域依赖的基础实体：

- `users`
- `admin_accounts`
- `projects`
- `project_members`

### 3.2 内容数据

内容数据负责信息分发：

- `announcements`
- `announcement_reads`
- `documents`
- `releases`

### 3.3 配置数据

- `shared_configs`

### 3.4 协作流程数据

- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_participants`
- `issue_logs`

### 3.5 研发流程数据

- `rd_stages`
- `rd_items`
- `rd_logs`

### 3.6 系统附属数据

- `uploads`
- `dashboard_preferences`

---

## 4. 核心设计原则

### 4.1 先流程，后表结构

Issue 和 RD 必须先冻结状态机、动作和权限矩阵，再固化字段和迁移。

### 4.2 一类实体归属一个核心域

例如：

- `issue_logs` 归属 Issue 域
- `rd_logs` 归属 RD 域
- `announcement_reads` 归属 Announcement 域

禁止创建横跨多个域且职责模糊的“超级表”。

### 4.3 主事实与投影分离

业务事实保存在核心业务表中：

- `issues`
- `rd_items`
- `announcements`

聚合结果和用户偏好不回写主事实表：

- `dashboard_preferences`

### 4.4 约束优先于代码约定

应尽可能使用：

- `NOT NULL`
- `CHECK`
- `UNIQUE`
- `FOREIGN KEY`
- 组合索引

而不是把关键约束只留在 service 层。

### 4.5 migration 必须增量化

不允许手工修改线上表结构作为正式方案，所有结构调整必须进入 migration 文件。

---

## 5. 数据库命名与通用字段约定

### 5.1 命名约定

- 表名：复数名词，使用下划线风格
- 主键：统一使用 `id`
- 外键：`${entity}_id`
- 时间字段：`*_at`
- 布尔字段：`is_*` 或 `enabled`

### 5.2 通用字段约定

多数业务表建议包含：

- `id`
- `created_at`
- `updated_at`

流程表按需补充：

- `created_by`
- `status`
- `published_at`
- `last_login_at`

### 5.3 ID 方案

建议继续使用字符串主键，应用层生成：

- `usr_*`
- `adm_*`
- `prj_*`
- `iss_*`
- `rdi_*`

原因：

- 与当前实现风格一致
- 方便日志和调试
- 无需依赖 SQLite 自增主键

---

## 6. 主数据设计

### 6.1 users

用途：

- 表示业务用户身份
- 作为项目成员、Issue 提报人、RD 创建人等业务主体

建议字段：

```text
id
username
display_name
email
mobile
title_code
status
source
remark
created_at
updated_at
```

建议约束：

- `username` 唯一
- `status` 限定为 `active | inactive`
- `source` 限定为 `local | imported`

建议索引：

- `idx_users_status`
- `idx_users_display_name`

### 6.2 admin_accounts

用途：

- 表示后台登录账号

建议字段：

```text
id
user_id nullable
username
password_hash
nickname
avatar_upload_id nullable
role
status
must_change_password
last_login_at nullable
created_at
updated_at
```

关键语义：

- `user_id` 允许为空，但必须在编码前明确是否长期允许
- `role` 当前可保持 `admin | user`

建议约束：

- `username` 唯一
- `user_id` 可唯一约束，但需允许空值

建议索引：

- `idx_admin_accounts_username`
- `idx_admin_accounts_status`
- `idx_admin_accounts_role`
- `idx_admin_accounts_user_id`

### 6.3 projects

用途：

- 项目主实体

建议字段：

```text
id
project_key
name
description
icon
status
visibility
created_at
updated_at
```

建议约束：

- `project_key` 唯一
- `status` 限定为 `active | inactive`
- `visibility` 初期可限定为 `internal | private`

建议索引：

- `idx_projects_key`
- `idx_projects_status`
- `idx_projects_visibility`
- `idx_projects_updated_at`

### 6.4 project_members

用途：

- 用户与项目的关系表

建议字段：

```text
id
project_id
user_id
display_name
role_code
is_owner
joined_at
created_at
updated_at
```

建议约束：

- `unique(project_id, user_id)`
- `is_owner` 使用 `0 | 1`

建议索引：

- `idx_project_members_project_id`
- `idx_project_members_user_id`
- `idx_project_members_role_code`

编码前需冻结：

- `role_code` 的可选值
- `display_name` 与 `users.display_name` 的优先级关系

---

## 7. 系统附属与资源数据

### 7.1 uploads

用途：

- 上传文件元数据
- 供头像、Issue 附件、其他文件引用

建议字段：

```text
id
bucket
category
file_name
original_name
file_ext
mime_type
file_size
checksum
storage_provider
storage_path
visibility
status
uploader_id
uploader_name
created_at
updated_at
```

建议索引：

- `idx_uploads_category`
- `idx_uploads_uploader_id`
- `idx_uploads_status`
- `idx_uploads_checksum`

设计建议：

- 当前保留 `uploads` 即可
- 命名应为后续演进到更通用 `resource` 模型留空间

---

## 8. 内容域数据设计

### 8.1 announcements

建议字段：

```text
id
project_id nullable
title
summary
content_md
scope
pinned
status
publish_at nullable
expire_at nullable
created_by
created_at
updated_at
```

关键语义：

- `project_id` 为空表示全局公告
- `scope` 建议保留，便于后续扩展
- `status` 建议限定为 `draft | published | archived`

建议索引：

- `idx_announcements_project_id`
- `idx_announcements_status`
- `idx_announcements_publish_at`
- `idx_announcements_pinned`

### 8.2 announcement_reads

建议字段：

```text
id
announcement_id
user_id
read_version
read_at
```

建议约束：

- `unique(announcement_id, user_id)`

作用：

- 记录阅读状态
- 用 `read_version` 对比公告更新版本

### 8.3 documents

建议字段：

```text
id
project_id nullable
slug
title
category
summary
content_md
status
version
created_by
created_at
updated_at
```

建议约束：

- `slug` 唯一
- `status` 限定为 `draft | published | archived`

建议索引：

- `idx_documents_slug`
- `idx_documents_project_id`
- `idx_documents_status`
- `idx_documents_updated_at`

### 8.4 releases

建议字段：

```text
id
project_id nullable
channel
version
title
notes
download_url
status
published_at nullable
created_by
created_at
updated_at
```

建议索引：

- `idx_releases_project_id`
- `idx_releases_channel`
- `idx_releases_status`
- `idx_releases_published_at`

### 8.5 shared_configs

建议字段：

```text
id
project_id nullable
scope
config_key
config_name
category
value_type
config_value
description
is_encrypted
priority
status
created_at
updated_at
```

建议约束：

- `unique(project_id, config_key)`
- `scope` 建议限定为 `global | project`

建议索引：

- `idx_shared_configs_project_id`
- `idx_shared_configs_scope`
- `idx_shared_configs_status`
- `idx_shared_configs_project_scope`

---

## 9. Issue 域数据设计

### 9.1 issues

用途：

- 问题单主体

建议字段：

```text
id
project_id
issue_no
title
description
type
status
priority
reporter_id
reporter_name
assignee_id nullable
assignee_name nullable
verifier_id nullable
verifier_name nullable
module_code nullable
version_code nullable
environment_code nullable
resolution_summary nullable
close_reason nullable
close_remark nullable
reopen_count
started_at nullable
resolved_at nullable
verified_at nullable
closed_at nullable
created_at
updated_at
```

需要特别说明：

- 相比当前 v1，建议补充 `verifier_id` `verifier_name` `verified_at`
- 这能让“待我验证”从推导关系变成显式业务字段

建议约束：

- `issue_no` 唯一
- `project_id` 非空
- `status` 需受状态机约束
- `priority` 建议限定为 `low | medium | high | critical`

建议索引：

- `idx_issues_project_id`
- `idx_issues_status`
- `idx_issues_assignee_id`
- `idx_issues_verifier_id`
- `idx_issues_reporter_id`
- `idx_issues_updated_at`

### 9.2 issue_comments

建议字段：

```text
id
issue_id
author_id nullable
author_name nullable
content
mentions_json
created_at
updated_at
```

建议索引：

- `idx_issue_comments_issue_id`
- `idx_issue_comments_created_at`

### 9.3 issue_attachments

建议字段：

```text
id
issue_id
upload_id
created_at
```

建议约束：

- `unique(issue_id, upload_id)`

建议索引：

- `idx_issue_attachments_issue_id`
- `idx_issue_attachments_upload_id`

### 9.4 issue_participants

建议字段：

```text
id
issue_id
user_id
user_name
created_at
```

建议约束：

- `unique(issue_id, user_id)`

建议索引：

- `idx_issue_participants_issue_id`
- `idx_issue_participants_user_id`

### 9.5 issue_logs

建议字段：

```text
id
issue_id
action_type
from_status nullable
to_status nullable
operator_id nullable
operator_name nullable
summary nullable
meta_json nullable
created_at
```

建议索引：

- `idx_issue_logs_issue_id`
- `idx_issue_logs_created_at`
- `idx_issue_logs_action_type`

设计原则：

- `issue_logs` 是事实日志，不是展示文案表
- 展示描述可以由前端或 Query 层再加工

---

## 10. RD 域数据设计

### 10.1 rd_stages

建议字段：

```text
id
project_id
name
sort
enabled
created_at
updated_at
```

建议约束：

- `unique(project_id, name)`

建议索引：

- `idx_rd_stages_project_id`
- `idx_rd_stages_project_sort`

### 10.2 rd_items

建议字段：

```text
id
project_id
rd_no
title
description
stage_id
type
status
priority
assignee_id nullable
assignee_name nullable
creator_id
creator_name
reviewer_id nullable
reviewer_name nullable
progress
plan_start_at nullable
plan_end_at nullable
actual_start_at nullable
actual_end_at nullable
blocker_reason nullable
created_at
updated_at
```

建议约束：

- `unique(project_id, rd_no)`
- `progress` 限制 `0-100`

建议索引：

- `idx_rd_items_project_id`
- `idx_rd_items_stage_id`
- `idx_rd_items_status`
- `idx_rd_items_assignee_id`
- `idx_rd_items_reviewer_id`
- `idx_rd_items_updated_at`

### 10.3 rd_logs

建议字段：

```text
id
project_id
item_id
action_type
content
operator_id nullable
operator_name nullable
meta_json nullable
created_at
```

建议索引：

- `idx_rd_logs_item_id`
- `idx_rd_logs_created_at`
- `idx_rd_logs_action_type`

---

## 11. Dashboard 与偏好数据

### 11.1 dashboard_preferences

用途：

- 保存用户工作台卡片配置

建议字段：

```text
id
user_id
stats_config_json
created_at
updated_at
```

建议约束：

- `user_id` 唯一

设计原则：

- 该表只存偏好配置
- 不缓存核心业务事实

### 11.2 预留扩展：notification_inbox

当前阶段不是必须，但可预留演进空间：

```text
id
user_id
type
title
message
entity_type
entity_id
project_id nullable
is_read
read_at nullable
created_at
```

当前建议：

- 暂不进入第一批 migration
- 如后续通知中心变复杂，再单独引入

---

## 12. 外键与删除策略

### 12.1 外键原则

建议开启 SQLite 外键约束。

关键外键：

- `project_members.project_id -> projects.id`
- `project_members.user_id -> users.id`
- `announcements.project_id -> projects.id`
- `documents.project_id -> projects.id`
- `issues.project_id -> projects.id`
- `issue_comments.issue_id -> issues.id`
- `issue_attachments.issue_id -> issues.id`
- `issue_attachments.upload_id -> uploads.id`
- `rd_stages.project_id -> projects.id`
- `rd_items.project_id -> projects.id`
- `rd_items.stage_id -> rd_stages.id`

### 12.2 删除策略

建议删除策略：

- 项目删除：原则上不鼓励物理删除，优先 `inactive`
- Issue 删除：仅在极少场景物理删除，日志需保留策略另议
- 上传删除：优先逻辑失效，不直接删除文件
- 用户删除：优先 `inactive`

编码建议：

- 大部分核心实体采用“状态停用”而非物理删除

---

## 13. 索引设计原则

### 13.1 建索引的重点场景

重点覆盖：

- 项目过滤
- 状态过滤
- 负责人过滤
- 时间倒序列表
- 唯一性约束

### 13.2 索引设计原则

1. 先覆盖核心查询路径
2. 不要为低频字段滥建索引
3. 组合索引优先服务真实查询模式
4. migration 后需验证关键列表查询

### 13.3 第一批重点索引

建议优先保障：

- `issues(project_id, status, updated_at)`
- `issues(project_id, assignee_id, status)`
- `rd_items(project_id, status, updated_at)`
- `announcements(status, publish_at)`
- `documents(status, updated_at)`

---

## 14. migration 设计

### 14.1 推荐拆分

```text
0001_base.sql
0002_project_members.sql
0003_content.sql
0004_issue.sql
0005_rd.sql
0006_dashboard.sql
```

### 14.2 各 migration 职责

`0001_base.sql`

- `users`
- `admin_accounts`
- 系统基础表

`0002_project_members.sql`

- `projects`
- `project_members`
- `uploads`

`0003_content.sql`

- `announcements`
- `announcement_reads`
- `documents`
- `releases`
- `shared_configs`

`0004_issue.sql`

- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_participants`
- `issue_logs`

`0005_rd.sql`

- `rd_stages`
- `rd_items`
- `rd_logs`

`0006_dashboard.sql`

- `dashboard_preferences`

### 14.3 migration 规则

1. migration 文件只增不改
2. 每次 migration 必须可重复执行校验
3. migration 命名与实施阶段一致
4. 禁止把数据迁移逻辑直接混在 schema migration 中

---

## 15. 数据迁移设计

### 15.1 迁移目标

将 v1 的业务数据稳定映射到 v2 结构中，并保留可演练、可回滚、可验证能力。

### 15.2 推荐迁移顺序

1. `users` / `admin_accounts`
2. `projects` / `project_members`
3. `announcements` / `documents` / `releases` / `shared_configs`
4. `uploads`
5. `issues` 及其附属表
6. `rd` 及其附属表
7. `dashboard_preferences`

### 15.3 迁移方式建议

建议拆成两类脚本：

- schema migration
- data migration

推荐目录：

```text
server/src/db/
  migrations/
  seeds/
  data-migrations/
```

### 15.4 迁移前必须完成的映射确认

编码前必须先确认：

1. `admin_users` -> `admin_accounts` 的字段映射
2. `users` 与 `project_members` 的显示名映射规则
3. `issues` 是否补 `verifier_id`
4. `shared_config` 是否改名为 `shared_configs`
5. 旧枚举值与新枚举值是否完全一致

---

## 16. 编码前必须冻结的数据库设计项

开始正式编码前，以下设计项必须冻结：

1. 主数据表结构
2. `admin_accounts.user_id` 语义
3. `project_members.role_code` 枚举
4. `issues.status` 与 `rd_items.status` 枚举
5. `issues.verifier_id` 是否引入
6. `shared_configs.scope` 枚举
7. 关键索引清单
8. migration 拆分顺序

---

## 17. 验收标准

数据库设计进入可编码状态，至少满足以下条件：

1. 表分组与业务域边界一致
2. 核心字段语义无歧义
3. 状态字段与状态机一致
4. 索引覆盖核心查询路径
5. migration 拆分可对应实施阶段
6. v1 -> v2 映射清单可列出

---

## 18. 后续关联文档

建议配套编写：

1. `04-api-design.md`
2. `05-implementation-roadmap.md`
