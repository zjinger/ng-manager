# 32 上传策略盘点与治理建议

本文档梳理 Hub V2 当前上传实现，重点覆盖：

- Web 前端有哪些上传入口
- 每个入口声明的上传策略
- 临时文件与最终文件的落盘路径
- Markdown 内联图片如何转正
- 无引用文件当前如何回收
- 现有策略问题与治理建议

本文是当前代码盘点文档，生命周期清理的基础规则可同时参考 [19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)。

## 1. 核心实现位置

| 层级 | 文件 | 作用 |
| --- | --- | --- |
| Web 策略定义 | `apps/hub-v2/web/src/app/shared/constants/upload-policies.ts` | 定义 `UPLOAD_TARGETS`、前端校验、`FormData` 构造 |
| Web Markdown 上传 | `apps/hub-v2/web/src/app/shared/services/image-upload.service.ts` | Markdown 编辑器、评论等图片上传统一调用服务 |
| Web 报销上传 | `apps/hub-v2/web/src/app/shared/services/reimbursement-upload.service.ts` | 报销附件上传封装 |
| Server 上传入口 | `apps/hub-v2/server/src/modules/upload/upload.routes.ts` | `POST /uploads`、`GET /uploads/:id/raw` |
| Server 策略校验 | `apps/hub-v2/server/src/modules/upload/upload-policy.ts` | 根据 `bucket/category` 决定后端允许类型与大小 |
| Server 上传服务 | `apps/hub-v2/server/src/modules/upload/upload.service.ts` | 创建上传记录、Markdown 图片转正、上传失活 |
| 共享策略 schema | `apps/hub-v2/shared/upload-policies.schema.json` | 上传策略单一来源 |
| 策略生成脚本 | `apps/hub-v2/scripts/generate-upload-policies.mjs` | 生成 Web 与 Server 使用的策略文件 |
| 文件保存 | `apps/hub-v2/server/src/shared/storage/file-storage.ts` | 生成文件名并写入本地 `UPLOAD_DIR` |
| temp 清理 | `apps/hub-v2/server/src/scripts/cleanup-temp-uploads.ts` | 清理过期且无引用的 `temp` 上传 |
| Issue 孤儿清理 | `apps/hub-v2/server/src/scripts/cleanup-issue-orphan-uploads.ts` | 清理 `issues` 桶内无引用的 markdown/comment 图片 |
| 通用 Markdown 孤儿清理 | `apps/hub-v2/server/src/scripts/cleanup-markdown-orphan-uploads.ts` | 清理 `issues` / `rd` / `documents` / `personal-todos` 已转正内联图片 |
| Personal Token Markdown 上传 | `apps/hub-v2/server/src/modules/personal-token/personal-token-upload.routes.ts` | 外部集成上传 Markdown 图片 |

## 2. Web 上传入口与策略

### 2.1 Markdown 编辑器图片

统一策略：`UPLOAD_TARGETS.markdownImage`

- 初始 `bucket`: `temp`
- `category`: `markdown`
- `visibility`: `private`
- 类型：图片
- 大小：10MB
- 初始路径：`<UPLOAD_DIR>/temp/<file>`
- 保存成功后由后端业务服务转正到业务目录

当前使用位置：

| 场景 | 前端位置 | 保存后目标 bucket | 最终路径 |
| --- | --- | --- | --- |
| Issue 创建 | `features/issues/dialogs/issue-create-dialog` | `issues` | `<UPLOAD_DIR>/issues/<issueId>/<file>` |
| Issue 编辑 | `features/issues/dialogs/issue-edit-dialog` | `issues` | `<UPLOAD_DIR>/issues/<issueId>/<file>` |
| Issue 流转/重开说明 | `features/issues/dialogs/issue-transition-dialog` | `issues` | `<UPLOAD_DIR>/issues/<issueId>/<file>` |
| RD 创建 | `features/rd/dialogs/rd-create-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| RD 编辑 | `features/rd/dialogs/rd-edit-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| RD 推进阶段 | `features/rd/dialogs/rd-advance-stage-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| RD 阶段任务创建 | `features/rd/dialogs/rd-stage-task-create-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| RD 阶段任务编辑 | `features/rd/dialogs/rd-stage-task-edit-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| RD 任务单描述 | `features/rd/dialogs/rd-task-sheet-dialog` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| 文档创建 | `features/content/dialogs/document-create-dialog` | `documents` | `<UPLOAD_DIR>/documents/<documentId>/<file>` |
| 个人待办描述 | `features/personal-todos/dialogs/todo-dialog` | `personal-todos` | `<UPLOAD_DIR>/personal-todos/<todoId>/<file>` |

### 2.2 Issue 评论图片

策略：`UPLOAD_TARGETS.commentImage`

- 初始 `bucket`: `temp`
- `category`: `comment`
- 类型：图片
- 大小：10MB
- 当前位置：`features/issues/components/issue-comment-editor`
- 当前说明：这是独立 textarea 上传实现，不走 `app-markdown-editor`。
- 保存后目标：`issues`
- 最终路径：`<UPLOAD_DIR>/issues/<issueId>/<file>`

### 2.3 Issue 附件面板

策略：`UPLOAD_TARGETS.issueAttachment`

- `bucket`: `issues`
- `category`: `attachment`
- 类型：图片、视频
- 大小：10MB
- 当前位置：
  - `features/issues/components/issue-attachments-panel`
  - `features/issues/store/issue-detail.store`
  - `features/issues/services/issue-api.service`
- 上传时传入 `entityType=issue`、`entityId=<issueId>`。
- 初始即落业务目录：`<UPLOAD_DIR>/issues/<issueId>/<file>`。
- 会写入 `issue_attachments` 关系表。

### 2.4 头像

| 场景 | 策略 | Web 位置 | 初始/最终路径 |
| --- | --- | --- | --- |
| 个人头像 | `UPLOAD_TARGETS.profileAvatar` | `features/profile/pages/profile-page`、`features/profile/services/profile-api.service` | `<UPLOAD_DIR>/avatars/<file>` |
| 项目头像 | `UPLOAD_TARGETS.projectAvatar` | `features/projects/dialogs/project-create-dialog`、`project-edit-dialog`、`features/projects/services/project-api.service` | `<UPLOAD_DIR>/project-avatars/<file>` |

### 2.5 报销附件

策略：`UPLOAD_TARGETS.reimbursementAttachment`

- `bucket`: `reimbursements`
- `category`: `attachment`
- 类型：JPG、PNG、PDF
- 大小：10MB
- 当前位置：
  - `features/reimbursement/shared/components/expense-summary-attachment`
  - `features/reimbursement/services/reimbursement-api.service`
  - `shared/services/reimbursement-upload.service`
- 初始即落业务目录：`<UPLOAD_DIR>/reimbursements/<file>`。
- 是否与具体报销单绑定取决于业务表里的附件数据，不经过 Markdown 转正。

### 2.6 RD 任务单附件与 Word 导入

| 场景 | 策略 | Web 位置 | 初始/最终路径 |
| --- | --- | --- | --- |
| 任务单附件 | `UPLOAD_TARGETS.taskSheetAttachment` | `features/rd/dialogs/rd-task-sheet-dialog`、`features/rd/components/rd-task-sheet-detail-drawer`、`features/rd/services/rd-task-sheet-api.service` | `<UPLOAD_DIR>/task-sheets/<file>` |
| 任务单 Word 导入 | `UPLOAD_TARGETS.taskSheetWordImport` | `features/rd/dialogs/rd-task-sheet-import-dialog`、`features/rd/services/rd-task-sheet-api.service` | `<UPLOAD_DIR>/task-sheets/<file>` |

### 2.7 Personal Token Markdown 上传

服务端还提供外部集成入口：`POST /projects/:projectKey/uploads/markdown`。

- 策略：后端直接使用 `resolveUploadPolicy("temp", "markdown")`
- 初始 `bucket`: `temp`
- `category`: `markdown`
- 类型：图片
- 大小：10MB
- 初始路径：`<UPLOAD_DIR>/temp/<file>`
- 返回内容包含 `uploadId` 与 `![alt](/api/admin/uploads/<uploadId>/raw)`
- 后续仍依赖 Issue/RD 等业务保存动作执行 Markdown 图片转正

## 3. 后端落盘规则

`POST /api/admin/uploads` 会读取表单字段：

- `bucket`
- `category`
- `visibility`
- `entityType`
- `entityId`
- `file`

后端会先通过 `normalizeBucket` 标准化 bucket，再按 `resolveUploadPolicy(bucket, category)` 做类型与大小校验。

当前落盘规则：

| 条件 | 落盘路径 |
| --- | --- |
| `bucket=issues` 且 `entityType=issue` 且有 `entityId` | `<UPLOAD_DIR>/issues/<entityId>/<file>` |
| 其他所有上传 | `<UPLOAD_DIR>/<bucket>/<file>` |

因此：

- Markdown 图片初始 `bucket=temp`，即使前端额外传了 `entityType/entityId`，初始仍落 `<UPLOAD_DIR>/temp/<file>`。
- Issue 附件面板使用 `bucket=issues` 且带 `entityType/entityId`，所以初始直落 `<UPLOAD_DIR>/issues/<issueId>/<file>`。
- `rd`、`documents`、`personal-todos` 这些 Markdown 最终业务目录不是上传入口直写，而是保存业务对象后由 `promoteMarkdownUploads` 迁移。

## 4. Markdown 图片转正规则

`promoteMarkdownUploads({ content, bucket, entityId })` 的行为：

1. 从 Markdown 文本中提取 `/api/admin/uploads/<uploadId>/raw`。
2. 只处理 `bucket='temp'` 的上传记录。
3. 只处理 `category` 为 `markdown*` 或 `comment` 的记录。
4. 将文件移动到 `<UPLOAD_DIR>/<bucket>/<entityId>/<file>`。
5. 更新 `uploads.bucket` 和 `uploads.storage_path`，`category` 保持不变。

当前转正目标：

| 业务 | 后端触发位置 | 目标 bucket | 最终路径 |
| --- | --- | --- | --- |
| Issue 描述/重开说明 | `modules/issue/issue.service.ts` | `issues` | `<UPLOAD_DIR>/issues/<issueId>/<file>` |
| Issue 评论 | `modules/issue/comment/issue-comment.service.ts` | `issues` | `<UPLOAD_DIR>/issues/<issueId>/<file>` |
| RD 描述/阶段说明/任务说明 | `modules/rd/services/*` | `rd` | `<UPLOAD_DIR>/rd/<rdItemId>/<file>` |
| 文档内容 | `modules/document/document.service.ts` | `documents` | `<UPLOAD_DIR>/documents/<documentId>/<file>` |
| 个人待办描述 | `modules/personal-todo/personal-todo.service.ts` | `personal-todos` | `<UPLOAD_DIR>/personal-todos/<todoId>/<file>` |

## 5. 无引用文件当前如何处理

### 5.1 temp 未转正文件

脚本：`cleanup-temp-uploads.ts`

当前逻辑：

- 只处理 `bucket='temp'`。
- 默认 dry-run。
- 超过 `--keep-days` 且未被业务文本引用时标记为 `inactive`。
- 开启 `--hard-delete` 后，再对已 `inactive` 且超过 `--hard-delete-days` 的记录删除文件和数据库行。

当前引用扫描覆盖：

- `issues.description`
- `issues.resolution_summary`
- `issues.close_remark`
- `issue_comments.content`
- `issue_logs.summary`
- `issue_logs.meta_json`
- `rd_items.description`
- `rd_logs.content`
- `rd_logs.meta_json`
- `rd_item_stage_notes.description`
- `rd_stage_tasks.description`
- `rd_stage_history.snapshot_json`
- `documents.content_md`
- `personal_todos.description`
- `announcements.content_md`
- `releases.notes`

### 5.2 Issue 桶 markdown/comment 孤儿图片

脚本：`cleanup-issue-orphan-uploads.ts`

当前逻辑：

- 只处理 `bucket='issues'`。
- 只处理 `category='comment'` 或 `category like 'markdown%'`。
- 排除 `issue_attachments` 显式附件关系。
- 排除 Issue、Comment、Log 文本引用。
- 同样采用 soft-delete + hard-delete 两阶段。

### 5.3 通用 Markdown 业务桶孤儿图片

脚本：`cleanup-markdown-orphan-uploads.ts`

命令：

- `npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan`（dry-run）
- `npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --bucket=rd`
- `npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --apply`
- `npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --apply --hard-delete`

当前覆盖 bucket：

- `issues`
- `rd`
- `documents`
- `personal-todos`

### 5.4 显式附件关系

- Issue 附件面板删除关系后，若无附件关系引用，会将对应 `uploads.status` 置为 `inactive`。
- 当前不立即物理删除，物理文件删除依赖后续清理策略。
- 报销附件、任务单附件、头像等场景当前没有统一的跨业务孤儿清理脚本。

## 6. 已治理项与剩余关注

### 已治理：前后端 policy 单一来源

上传策略已改为由 `apps/hub-v2/shared/upload-policies.schema.json` 统一生成：

- Web 生成文件：`web/src/app/shared/constants/generated-upload-policies.ts`
- Server 生成文件：`server/src/modules/upload/generated-upload-policies.ts`
- 构建前通过 `prebuild` 自动执行 `generate-upload-policies.mjs`

后续修改上传策略时，只改 schema，再运行：

- `npm --prefix apps/hub-v2 run generate:upload-policies`

### 已治理：清理覆盖范围补齐个人待办与 RD 字段

`cleanup-temp-uploads.ts` 已补充 `personal_todos.description`，并补齐 Issue/RD 更多可能保存 Markdown 图片链接的字段。

### 已治理：业务桶 Markdown orphan 清理

新增 `cleanup-markdown-orphan-uploads.ts`，覆盖 `issues`、`rd`、`documents`、`personal-todos`。

### 已治理：任务单附件前后端允许类型一致

`taskSheetAttachment` 已统一为 Word / PDF / JPG / PNG，后端不再额外放行 `.gif/.webp/.bmp/.svg`。

### 已治理：后端 bucket allowlist

通用 `/uploads` 入口已对标准化后的 bucket 做 allowlist 校验，避免 typo 直接生成新目录。

### 已治理：Markdown uploadId 提取工具

服务端已通过 `shared/uploads/upload-markdown.ts` 统一提取和判断 `/api/admin/uploads/<id>/raw` 引用。

### 剩余关注：附件、头像、报销、任务单的孤儿清理

报销附件、任务单附件、头像、skill 包等非 Markdown 上传仍主要依赖业务关系或业务删除流程，没有统一孤儿清理脚本。

建议：

- 后续按业务关系表补专门 cleanup，而不是混入 Markdown orphan 脚本。

### 剩余关注：外部 URL 形态

`shared/uploads/upload-markdown.ts` 已支持带完整域名的 `/api/admin/uploads/<id>/raw`。如果未来新增非 `/api/admin` 前缀，需要继续扩展统一工具。

### 已治理：个人待办描述长度与失败提示

个人待办描述限制为 10000 字，图片 Markdown 文本计入长度。保存失败时会展示后端错误信息，若无具体错误，会提示检查描述中的图片上传状态。

## 7. 建议治理顺序

1. 新增上传场景时，先在 `shared/upload-policies.schema.json` 声明策略。
2. 新增 Markdown/富文本字段时，同步更新 temp 清理与通用 markdown orphan 清理引用字段。
3. 新增业务 bucket 时，同步更新 schema 的 `allowedBuckets`。
4. 非 Markdown 附件类上传需要定义业务关系表和失效/清理策略。
