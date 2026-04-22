# 19 上传生命周期与清理策略

本文档定义 Hub V2 当前上传体系的行为边界，覆盖：

- 文件上传入口与落库规则
- `bucket` / `category` 语义与策略
- Issue 场景下“关联删除”与“内容删除”的差异
- `temp` 与 `issues` 桶的清理策略与执行建议

## 1. 数据模型与核心字段

统一上传表：`uploads`

- `id`: 上传 ID（如 `upl_xxx`）
- `bucket`: 存储桶（如 `temp` / `issues` / `avatars` / `project-avatars`）
- `category`: 业务类别（如 `attachment` / `comment` / `markdown`）
- `storage_path`: 实际文件路径
- `status`: `active` / `inactive`
- `created_at` / `updated_at`: 生命周期时间

Issue 附件关系表：`issue_attachments`

- `issue_id` + `upload_id` 建立“问题附件面板”的显式关联
- 仅附件面板上传会写入该关系

## 2. Bucket 与 Category 说明

当前前后端约定下的常见组合如下：

| 场景 | bucket | category | 说明 |
| --- | --- | --- | --- |
| Issue 附件面板上传 | `issues` | `attachment` | 图片/视频，显式附件关系 |
| Issue 描述/重开说明等 markdown 图片 | `temp`（初始） | `markdown`（或 `markdown*`） | 提交业务动作后转正到 `issues` |
| Issue 评论图片 | `temp`（初始） | `comment` | 提交评论后转正到 `issues` |
| 个人头像 | `avatars` | `avatar` | 头像上传 |
| 项目头像 | `project-avatars` | `project_avatar` | 项目头像上传 |

说明：

- markdown/comment 先落 `temp`，在提交动作时由服务端 `promoteMarkdownUploads` 转正到 `issues`。
- 附件面板上传为直传 `issues/attachment`，不经过 `temp`。

## 3. 上传与关联规则（Issue 维度）

### 3.1 会写入 `issue_attachments` 的场景

- 仅 `app-issue-attachments-panel` 上传后调用 `POST /issues/:issueId/attachments` 的流程。

### 3.2 不会写入 `issue_attachments` 的场景

- Issue 描述中的 markdown 图片
- Issue 评论中的图片
- 重开说明中的图片

上述场景均属于“正文内联图片”，通过文本中的 `/api/admin/uploads/:uploadId/raw` 引用，不走附件关系表。

## 4. 删除策略（当前实现）

### 4.1 附件面板删除

当用户在附件面板删除时：

1. 删除 `issue_attachments` 对应关系。
2. 若该 `upload` 已无任何 `issue_attachments` 引用，且 `bucket='issues'` 且 `category='attachment'`：
   1. 将 `uploads.status` 更新为 `inactive`。
   2. 不做物理文件删除（当前策略）。

### 4.2 markdown/comment 内容中删除图片

- 用户从描述/评论/重开说明文本中删掉图片链接时，不会即时更新 `uploads.status`。
- 这类“失去文本引用”的文件依赖离线清理脚本回收。

## 5. 清理策略

采用“两阶段清理”：

1. Soft Delete：将候选记录标记为 `inactive`。
2. Hard Delete：对已 `inactive` 且超过二次保留期的记录，删除文件并删除数据库行。

### 5.1 temp 桶清理脚本

脚本：`apps/hub-v2/server/src/scripts/cleanup-temp-uploads.ts`

命令：

- `npm --prefix apps/hub-v2/server run uploads:cleanup-temp`（dry-run）
- `npm --prefix apps/hub-v2/server run uploads:cleanup-temp -- --apply`
- `npm --prefix apps/hub-v2/server run uploads:cleanup-temp -- --apply --hard-delete`

### 5.2 issues 桶孤儿 markdown/comment 清理脚本

脚本：`apps/hub-v2/server/src/scripts/cleanup-issue-orphan-uploads.ts`

处理范围：

- `bucket='issues'`
- `category='comment'` 或 `category like 'markdown%'`
- 不被 `issue_attachments` 引用
- 不被 Issue/Comment/Log 文本引用

命令：

- `npm --prefix apps/hub-v2/server run uploads:cleanup-issues-orphan`（dry-run）
- `npm --prefix apps/hub-v2/server run uploads:cleanup-issues-orphan -- --apply`
- `npm --prefix apps/hub-v2/server run uploads:cleanup-issues-orphan -- --apply --hard-delete`

通用参数：

- `--keep-days=N`：active 候选保留天数（默认 `14`）
- `--hard-delete-days=N`：inactive 后再保留天数（默认 `7`）
- `--limit=N`：单次最多处理条数

## 6. 推荐运维策略

建议在生产环境按固定周期执行：

1. 每天执行一次 dry-run，观察候选规模与异常。
2. 每天执行一次 `--apply` soft-delete。
3. 每周执行一次 `--apply --hard-delete`。
4. 首次启用时先用小 `--limit` 灰度。

## 7. 已知边界

- 附件面板删除目前不做物理删除，仅状态失活，便于审计与回滚排查。
- 内联图片（markdown/comment）是否可回收，依赖“文本引用扫描”的覆盖范围；新增业务富文本字段时需同步纳入清理 SQL。
