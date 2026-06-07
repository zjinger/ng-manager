# 13 Hub V2 Token 体系与 webapp 读写接入方案

最后更新：2026-06-05

## 1. 背景与目标

`ng-manager/webapp` 需要在不进入 Hub 管理端的前提下，直接读取并操作 Hub V2 的 Issue、RD 与文档数据。  
本方案用于冻结 Token 体系、接口口径、权限口径与审计口径，直接指导开发与测试。

目标如下：

- 提供稳定的 webapp 接入链路
- 统一 Token 体系与权限模型
- 统一 Issue、RD 与文档的读写方案

---

## 2. 总体架构

调用链路如下：

- `webapp -> packages/server -> packages/api -> hub-v2`

职责如下：

- webapp 传 `projectId` 与业务路径（业务相对路径）
- packages/server 基于 `projectId` 读取项目配置，解析 `projectKey` 与鉴权信息
- hub-v2 负责 scope 校验、业务权限校验、状态机校验、审计落库

映射关系：

- webapp 本地项目：`projectId`
- 项目配置：`projectId -> NGM_HUB_V2_PROJECT_KEY`
- hub-v2 路由：`/api/token/projects/:projectKey/...`
- hub-v2 内部：`projectKey -> hub-v2 projectId`（服务端解析）

---

## 3. Token 体系

### 3.1 Project Token

- 用于读取项目数据
- 默认只读权限
- 不用于关键写操作

### 3.2 Personal Token

- 用于关键写操作
- 绑定用户身份
- 支持吊销、过期、轮换

### 3.3 实施结论

- 读取统一使用 Project Token
- 关键写操作统一使用 Personal Token

### 3.4 MCP Agent 能力对齐口径

Token API 是 Hub V2 后端接口契约，MCP tools 是面向 AI Agent 的受控子集。`hub-v2-api` skill 只能推荐当前已暴露的 MCP tool；Token route 已存在但 MCP tool 未开放的能力，不应在 Agent 回复中承诺可执行，也不应改用评论、RD 项等近似操作代替。

MCP 写入类工具仍遵循 MCP Server 的安全口径：默认 preview，真实执行需要 `confirm=true` 与 `NGM_MCP_ALLOW_WRITE=true`，并由 Hub V2 Personal Token 继续校验 scope、项目成员关系、业务权限与状态机。

当前 MCP 已暴露能力如下：

| 领域 | Token / 配置能力 | MCP tool | 状态 |
|---|---|---|---|
| 连接与项目 | agent connection 配置、项目列表 | `hub_v2_projects_list`、`hub_v2_projects_get` | 已暴露 |
| 项目成员 | `GET /api/token/projects/:projectKey/members` | `hub_v2_project_members_list` | 已暴露 |
| Docs 读取 | `GET /api/token/projects/:projectKey/docs*` | `hub_v2_docs_list`、`hub_v2_docs_get`、`hub_v2_docs_get_by_slug` | 已暴露 |
| Docs 写入 | `POST /api/personal/projects/:projectKey/docs`、`PATCH /api/personal/projects/:projectKey/docs/:docId` | `hub_v2_docs_create`、`hub_v2_docs_update` | 已暴露 |
| Issue 读取 | `GET /api/token/projects/:projectKey/issues*` | `hub_v2_issues_list`、`hub_v2_issues_get` | 已暴露 |
| Issue 写入 | 创建、编辑、评论、指派 | `hub_v2_issues_create`、`hub_v2_issues_update`、`hub_v2_issues_comment`、`hub_v2_issues_assign` | 已暴露 |
| Issue 协作 | 新增协作人、创建协作分支 | `hub_v2_issues_participant_add`、`hub_v2_issues_branch_create` | 已暴露 |
| 上传 | Markdown 图片、受控附件文件 | `hub_v2_upload_markdown_image`、`hub_v2_file_upload` | 已暴露 |
| RD 读取 | 研发项列表、详情、当前阶段任务 | `hub_v2_rd_list`、`hub_v2_rd_get`、`hub_v2_rd_stage_tasks_list` | 已暴露 |
| RD 写入 | 创建研发项、推进阶段、新增阶段任务、更新进度 | `hub_v2_rd_create`、`hub_v2_rd_advance_stage`、`hub_v2_rd_stage_tasks_create`、`hub_v2_rd_update_progress` | 已暴露 |

当前 Token route 已存在但 MCP 暂未暴露的能力如下：

| 领域 | Token route / 能力 | MCP 状态 | Agent 口径 |
|---|---|---|---|
| Docs | 发布文档 `POST /api/personal/projects/:projectKey/docs/:docId/publish` | 暂未暴露 | skill 不应承诺可通过 MCP 发布 |
| Issue 读取 | 日志、评论列表、协作人列表、附件列表、协作分支列表、附件 raw 读取 | 暂未暴露 | 可说明 Token API 存在，但 MCP 当前无对应 tool |
| Issue 流转 | claim、start、wait-update、resolve、verify、reopen、close | 暂未暴露 | 不应改用评论或 RD tool 代替 |
| Issue 分支流转 | start-mine、start、complete | 暂未暴露 | MCP 当前只支持创建协作分支 |
| Issue 协作人删除 | `DELETE /participants/:participantId` | 暂未暴露 | 不应承诺可删除 |
| RD 读取 | 阶段字典、日志、阶段历史、成员进度、进度历史、Markdown 图片 raw 读取 | 暂未暴露 | 可作为后续 MCP read tool 补齐 |
| RD 流转 | start、block、resume、complete、accept、reopen、close | 暂未暴露 | MCP 当前只支持 `advance-stage` 与 `update-progress` |
| RD 编辑 | 基础信息 patch | 暂未暴露 | 不应承诺可编辑基础字段 |
| Feedback | feedback 列表与详情 | 暂未暴露 | 当前不属于 `hub-v2-api` MCP skill 执行能力 |

---

## 4. 配置规范

项目配置键：

- `NGM_HUB_V2_BASE_URL`
- `NGM_HUB_V2_PROJECT_KEY`
- `NGM_HUB_V2_TOKEN`
- `NGM_HUB_V2_PERSONAL_TOKEN`

约束：

- `projectKey` 按配置原值使用，仅做空白处理
- `webapp -> packages/server` 推荐统一传业务相对路径（如 `/issues`、`/rd-items`）
- `packages/server` 负责将相对路径补齐为 `/projects/:projectKey/...` 后再转发到 hub-v2
- 禁止在 `path` 中传本地 `projectId`（例如 `/projects/proj_xxx/...`）

---

## 5. 接口方案

### 5.1 webapp 到 packages/server

1. `POST /api/client/hub-token/resolve`  
入参：`{ projectId }`  
出参：`{ baseUrl, tokenConfigured, personalTokenConfigured, projectKey }`

2. `POST /api/client/hub-token/request`  
入参示例：

```json
{
  "projectId": "proj_xxx",
  "path": "/issues",
  "method": "GET",
  "query": { "page": 1, "pageSize": 20 }
}
```

说明：

- webapp 推荐统一传业务相对路径（如 `/issues`、`/issues/:issueId/logs`、`/rd-items`）
- packages/server 会基于 `projectId` 自动补齐到 `/projects/:projectKey/...` 后转发
- 读取请求默认使用 Project Token；关键写请求需显式传 `tokenType: "personal"`
- 二进制直连读取场景可通过 packages/server 代理：
  - `GET /api/client/hub-token/projects/:projectId/issues/:issueId/attachments/:attachmentId/raw`
  - `GET /api/client/hub-token/projects/:projectId/issues/:issueId/uploads/:uploadId/raw`

Personal Token 写入请求示例：

```json
{
  "projectId": "proj_xxx",
  "path": "/docs",
  "method": "POST",
  "tokenType": "personal",
  "body": {
    "title": "自动生成文档",
    "content": "# 自动生成文档",
    "status": "draft",
    "source": "webapp"
  }
}
```

---

## 5.2 读取接口

Issue：

- `GET /api/token/projects/:projectKey/issues`
- `GET /api/token/projects/:projectKey/issues/:issueId`
- `GET /api/token/projects/:projectKey/issues/:issueId/logs`
- `GET /api/token/projects/:projectKey/issues/:issueId/comments`
- `GET /api/token/projects/:projectKey/issues/:issueId/participants`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments`
- `GET /api/token/projects/:projectKey/issues/:issueId/branches`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments/:attachmentId/raw`（显式附件展示）
- `GET /api/token/projects/:projectKey/issues/:issueId/uploads/:uploadId/raw`（Issue 描述/评论中内联图片展示）
- `GET /api/token/projects/:projectKey/members`（用于评论 @ 成员候选）

说明：

- Issue 列表支持 `rdItemId` 查询参数（`/issues?rdItemId=<RD_ITEM_ID>`），用于按研发项过滤关联测试单
- Issue 列表与详情返回新增关联快照字段：
  - `rdItemId`
  - `rdNoSnapshot`
  - `rdTitleSnapshot`
  - `rdStatusSnapshot`
- 关键字检索会命中 `title/issueNo/description`，也会命中 `rdNoSnapshot/rdTitleSnapshot`
- `attachmentId` 对应 `issue_attachments.id`，仅用于显式附件
- `uploadId` 对应 Markdown 图片上传后的 `uploads.id`
- 内联图片不要求存在 `issue_attachment` 记录，但要求该 `uploadId` 已被当前 Issue 描述或评论内容引用，且上传分类为 `markdown*` 或 `comment`

RD：

- `GET /api/token/projects/:projectKey/rd-stages`（研发阶段字典）
- `GET /api/token/projects/:projectKey/rd-items`
- `GET /api/token/projects/:projectKey/rd-items/:itemId`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/logs`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/stage-history`（研发阶段历史）
- `GET /api/token/projects/:projectKey/rd-items/:itemId/stage-tasks`（当前研发项阶段任务与负责人进度）
- `GET /api/token/projects/:projectKey/rd-items/:itemId/progress`（成员进度）
- `GET /api/token/projects/:projectKey/rd-items/:itemId/progress/history`（成员进度历史）
- `GET /api/token/projects/:projectKey/rd-items/:itemId/uploads/:uploadId/raw`（RD 描述中的 Markdown 图片展示）
- `GET /api/token/projects/:projectKey/issues?rdItemId=:itemId`（RD 详情关联测试单列表）

说明：

- RD Markdown 图片能力与 Issue 一致，`uploadId` 对应 `uploads.id`
- 不要求存在 `issue_attachment` 记录，但要求该 `uploadId` 已被当前 RD 描述引用，且上传分类为 `markdown`
- 研发项关闭后保留历史关联测试单；已关闭研发项不允许新增/改绑测试单关联
- Project Token 的 RD 能力保持只读；研发项创建、阶段任务创建和流程写入均使用 Personal Token

Feedback：
- `GET /api/token/projects/:projectKey/feedbacks`
- `GET /api/token/projects/:projectKey/feedbacks/:feedbackId`

Docs：

- Project Token 文档读取接口已开放，使用 `docs:read` scope。
- 现有可读取文档的路径分为两类：
  - 管理端登录态：`GET /api/admin/documents`、`GET /api/admin/documents/:documentId`
  - 公共发布态：`GET /api/public/documents`、`GET /api/public/documents/:projectKey/:slug`
- 上述两类不等同于 Token 读取：
  - 管理端接口依赖用户登录态，不适合 webapp 后端代理用 Project Token 调用
  - 公共接口只面向已发布内容，不覆盖草稿、未发布内容，也不绑定 Project Token scope

Project Token 文档读取接口：

- `GET /api/token/projects/:projectKey/docs`
- `GET /api/token/projects/:projectKey/docs/:docId`
- `GET /api/token/projects/:projectKey/docs/by-slug/:slug`

查询参数：

| 参数 | 说明 |
|---|---|
| `page` / `pageSize` | 分页 |
| `keyword` | 搜索标题、摘要、正文或 slug |
| `category` / `categoryId` | 文档分类；`categoryId` 作为 `category` 兼容别名 |
| `status` | 可选 `draft`、`published`、`archived` |
| `statusGroup=active` | 默认查询草稿与已发布，不返回已归档 |

详情返回字段：

```json
{
  "id": "doc_xxx",
  "projectId": "prj_xxx",
  "slug": "api-token-integration",
  "title": "Token API 接入说明",
  "category": "integration",
  "categoryId": "integration",
  "summary": "文档摘要",
  "contentMd": "# 文档正文",
  "status": "published",
  "version": null,
  "createdBy": "usr_xxx",
  "createdByName": "张三",
  "publishAt": "2026-06-01T09:00:00.000Z",
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-06-01T09:00:00.000Z"
}
```

列表接口返回同样的元信息字段，并包含 `createdByName` 供列表展示作者，但不返回 `contentMd`。需要正文时调用 `GET /api/token/projects/:projectKey/docs/:docId` 或 `GET /api/token/projects/:projectKey/docs/by-slug/:slug` 获取详情。

权限与安全口径：

- 必须使用 Project Token，且包含 `docs:read` scope
- 只允许读取目标 `projectKey` 下的文档
- 列表默认不返回已归档内容；读取已归档列表需显式传 `status=archived`
- 默认列表允许读取 `draft/published`，用于 webapp 内部联动；仍受 Project Token 与项目边界控制
- 读取接口当前不写入 Token 审计；若后续需要追踪读取行为，可单独开启 `doc.read` 审计

---

## 5.3 写入接口

Issue：

- `POST /api/personal/projects/:projectKey/issues`
- `PATCH /api/personal/projects/:projectKey/issues/:issueId`
- `POST /api/personal/projects/:projectKey/issues/:issueId/comments`
- `POST /api/personal/projects/:projectKey/issues/:issueId/assign`
- `POST /api/personal/projects/:projectKey/issues/:issueId/claim`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/start-mine`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/:branchId/start`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/:branchId/complete`
- `POST /api/personal/projects/:projectKey/issues/:issueId/start`
- `POST /api/personal/projects/:projectKey/issues/:issueId/wait-update`
- `POST /api/personal/projects/:projectKey/issues/:issueId/resolve`
- `POST /api/personal/projects/:projectKey/issues/:issueId/verify`
- `POST /api/personal/projects/:projectKey/issues/:issueId/reopen`
- `POST /api/personal/projects/:projectKey/issues/:issueId/close`
- `POST /api/personal/projects/:projectKey/issues/:issueId/participants`
- `DELETE /api/personal/projects/:projectKey/issues/:issueId/participants/:participantId`

RD：

- `POST /api/personal/projects/:projectKey/rd-items`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/start`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/block`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/resume`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/complete`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/accept`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/reopen`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/close`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/advance-stage`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/progress`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/stage-tasks`
- `PATCH /api/personal/projects/:projectKey/rd-items/:itemId`

Docs：

- `POST /api/personal/projects/:projectKey/docs`
- `PATCH /api/personal/projects/:projectKey/docs/:docId`
- `POST /api/personal/projects/:projectKey/docs/:docId/publish`

Markdown 图片上传：

- `POST /api/personal/projects/:projectKey/uploads/markdown`

说明：

- 该接口仅用于 Markdown 正文内联图片，不是通用附件管理接口
- 必须使用 Personal Token
- 不新增独立 upload scope，上传权限由业务写 scope 派生；任一满足即可：
  - `issue:create:write`
  - `issue:update:write`
  - `issue:comment:write`
  - `rd:create:write`
  - `rd:stage-task:write`
  - `rd:transition:write`
  - `rd:edit:write`
- 仅允许图片，沿用 markdown image upload policy
- 上传先落库为 `bucket=temp`、`category=markdown`
- 返回的 `markdown` 可直接插入 Issue 描述、Issue 评论、RD 描述或 RD 阶段任务描述
- 后续创建/评论/更新服务会根据 Markdown 中的 `/api/admin/uploads/:uploadId/raw` 引用，将 temp 上传转移到对应业务 bucket

返回示例：

```json
{
  "code": "OK",
  "message": "markdown image uploaded",
  "data": {
    "uploadId": "upl_xxx",
    "markdown": "![image.png](/api/admin/uploads/upl_xxx/raw)",
    "upload": {
      "id": "upl_xxx",
      "bucket": "temp",
      "category": "markdown",
      "originalName": "image.png",
      "mimeType": "image/png",
      "fileSize": 12345
    }
  }
}
```

受控附件文件上传：

- `POST /api/personal/projects/:projectKey/uploads/file`

说明：

- 该接口用于 AI Agent 或脚本先上传非 Markdown 内联图片类附件，返回可被后续业务操作消费的 `uploadId`
- 当前支持 `target=issueAttachment` 与 `target=taskSheetAttachment`
- `issueAttachment` 使用 `issue:update:write` scope
- `taskSheetAttachment` 使用 `rd:stage-task:write` 或 `rd:edit:write` scope
- 接口只完成文件上传和落库，不自动挂载到 Issue、RD 或阶段任务；后续必须由明确的业务 attach/update 工具消费 `uploadId`
- 该能力在 MCP 中对应 `hub_v2_file_upload`

返回示例：

```json
{
  "code": "OK",
  "message": "file uploaded",
  "data": {
    "uploadId": "upl_xxx",
    "rawUrl": "/api/admin/uploads/upl_xxx/raw",
    "upload": {
      "id": "upl_xxx",
      "bucket": "temp",
      "category": "issue-attachment",
      "originalName": "error-log.txt",
      "mimeType": "text/plain",
      "fileSize": 12345
    }
  }
}
```

创建请求体：

```json
{
  "title": "自动生成文档",
  "content": "# 自动生成文档\n\n这是由脚本创建的文档。",
  "slug": "optional-doc-slug",
  "categoryId": "automation",
  "summary": "自动化创建的文档",
  "tags": ["auto", "hub-v2"],
  "status": "draft",
  "source": "cli"
}
```

编辑请求体：

```json
{
  "title": "更新后的文档标题",
  "content": "# 更新后的文档正文",
  "slug": "updated-doc-slug",
  "categoryId": "automation",
  "summary": "更新后的文档摘要",
  "tags": ["auto", "hub-v2"],
  "source": "cli"
}
```

发布请求体：

```json
{
  "source": "cli"
}
```

说明：

- 必须使用 Personal Token，不允许使用 Project Token 创建文档
- 创建必须包含 `doc:create:write` scope
- 编辑必须包含 `doc:update:write` scope
- 发布必须包含 `doc:publish:write` scope
- `content` 会按现有文档模型归一化为 `contentMd`
- `categoryId` 作为现有 `category` 字段的兼容别名处理；当前没有独立文档分类表
- 创建时 `status` 仅允许缺省或 `draft`
- 编辑接口不允许通过 `status` 发布或归档；发布必须调用 `/publish`
- `slug` 可选；未传时由服务端按标题生成项目内唯一 slug
- 创建、编辑、发布成功后写入 Token 调用审计，不记录 token 原文和完整正文

---

## 5.4 Personal Token 自检接口

- `GET /api/personal/me`
- `GET /api/personal/projects/:projectKey/capabilities`

说明：

- `me` 用于返回 token 当前身份与 scopes
- `capabilities` 用于返回项目成员关系、项目状态、可执行动作矩阵（可用于按钮显隐与前置拦截）

---

## 6. 权限方案

### 6.1 Scope 映射

| 模块 | 操作 | Scope |
|---|---|---|
| Issue | 列表与详情 | `issues:read` |
| Issue | 创建测试单 | `issue:create:write` |
| Issue | 编辑测试单 | `issue:update:write` |
| Issue | 评论 | `issue:comment:write` |
| Issue/RD | Markdown 图片上传 | 由目标业务写 scope 派生 |
| Issue/RD | 受控附件文件上传 | 由 `target` 派生：`issueAttachment` 使用 `issue:update:write`；`taskSheetAttachment` 使用 `rd:stage-task:write` 或 `rd:edit:write` |
| Issue | 状态流转 | `issue:transition:write` |
| Issue | 指派与认领 | `issue:assign:write` |
| Issue | 协作分支管理 | `issue:branch:write` |
| Issue | 协作人管理 | `issue:participant:write` |
| RD | 列表与详情 | `rd:read` |
| Feedback | 列表与详情 | `feedbacks:read` |
| Docs | 文档读取（Project Token） | `docs:read` |
| Docs | 创建文档 | `doc:create:write` |
| Docs | 编辑文档 | `doc:update:write` |
| Docs | 发布文档 | `doc:publish:write` |
| RD | 创建研发项 | `rd:create:write` |
| RD | 更新自己的阶段任务进度 | `rd:progress:write` |
| RD | 新增当前阶段任务 | `rd:stage-task:write` |
| RD | 状态流转与进度 | `rd:transition:write` |
| RD | 编辑基础信息 | `rd:edit:write` |

### 6.2 判定规则

操作放行需同时满足：

1. Token 有效
2. Scope 允许
3. 业务角色允许

角色权限基线：

- Issue 参照 [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)
- RD 参照 [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)
- Docs 创建、编辑、发布要求 token owner 是目标项目成员，并复用现有文档 service 的项目访问校验与创建者校验

安全补充（Token 鉴权阶段）：

- Project Token 与 Personal Token 均校验持有者状态，持有者非 `active` 时拒绝通过鉴权
- 对 `api/token` 与 `api/personal` 请求启用 token 级限流，超限返回 `429 TOKEN_RATE_LIMITED`

---

## 7. 状态机规则

Issue 状态流转以 [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix) 为准。

RD 状态流转如下：

- `todo -> doing`
- `doing -> blocked`
- `blocked -> doing`
- `doing -> done`
- `done -> accepted`
- `todo|doing|blocked|done|accepted -> closed`
- `closed -> todo`
- `accepted -> todo`（推进到下一阶段后重置为待开始）

补充规则：

- 当前阶段存在阶段任务时，RD 主进度按“阶段任务 × 负责人”的进度平均值计算；无有效阶段任务时，才回退到成员进度平均值。
- Personal Token 更新个人进度时，如当前阶段存在有效阶段任务，必须传 `stageTaskId`，且该任务必须分配给当前 token 用户。
- 当 RD 主进度到 `100%` 时，状态进入 `done`
- `done` 后由验证人决定：`accept`（当前阶段完成）或 `close`（中途关闭/结项关闭）
- 仅 `accepted` 状态允许 `advance-stage`，推进后进入下一阶段并重置阶段成员进度

---

## 8. 数据模型

Project Token 表：`project_api_tokens`

- `project_id`
- `owner_user_id`
- `token_prefix`
- `token_hash`
- `scopes_json`
- `status`
- `expires_at`
- `last_used_at`

Personal Token 表：`personal_api_tokens`

- `owner_user_id`
- `token_prefix`
- `token_hash`
- `scopes_json`
- `status`
- `expires_at`
- `last_used_at`

Token 调用审计表：`api_token_audit_logs`

- `token_type`
- `token_id`
- `actor_user_id`
- `project_id`
- `project_key`
- `action`
- `resource_type`
- `resource_id`
- `ip`
- `user_agent`
- `metadata_json`
- `created_at`

说明：

- `metadata_json` 只记录标题、分类、摘要、标签、状态、来源、slug 等非敏感信息
- 不记录 token 原文、完整正文 content 或敏感请求头

---


## 9. Curl 验证示例

本节用于验证 Hub V2 Token API 路由，不代表所有示例都已经开放为 MCP tool。Agent 可执行能力以 [3.4 MCP Agent 能力对齐口径](#34-mcp-agent-能力对齐口径) 为准。

### 9.1 Personal Token 写评论

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/comments" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"content\":\"[PTK验证] 评论写入测试\"}"
```

### 9.2 Project Token 读取 Issue 列表

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/issues?page=1&pageSize=20" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.3 Project Token 读取 Issue Markdown 图片

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/uploads/<UPLOAD_ID>/raw" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.4 Personal Token 获取身份与能力

```bash
curl -X GET "http://<HUB_V2_HOST>/api/personal/me" -H "Authorization: Bearer <PERSONAL_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/capabilities" -H "Authorization: Bearer <PERSONAL_TOKEN>"
```

### 9.5 Project Token 读取协作分支列表

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/branches" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.6 Personal Token 创建 Issue 与开始协作

创建 Issue 时，`projectId` 由 URL 中的 `projectKey` 决定，不能从请求体覆盖。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/issues" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"登录异常测试\",\"description\":\"复现登录接口异常。\",\"type\":\"bug\",\"priority\":\"medium\",\"assigneeId\":\"u_001\",\"verifierId\":\"u_002\",\"rdItemId\":\"<RD_ITEM_ID>\",\"moduleCode\":\"auth\",\"versionCode\":\"v1\",\"environmentCode\":\"test\"}"
```

编辑 Issue 时使用 `issue:update:write` scope。

```bash
curl -X PATCH "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/issues/<ISSUE_ID>" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"登录异常测试补充\",\"description\":\"补充复现步骤。\",\"priority\":\"high\"}"
```

Issue 协作分支仍使用 `issue:branch:write` scope。

MCP 当前对应 `hub_v2_issues_branch_create`，只负责创建协作分支；`start-mine`、`start`、`complete` 暂未开放为 MCP tool。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/branches/start-mine" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"协作分支标题\"}"
```

### 9.7 Project Token 读取 RD 阶段历史与进度

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/stage-history" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/progress" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/progress/history" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/stage-tasks" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.8 Project Token 读取 RD Markdown 图片

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/uploads/<UPLOAD_ID>/raw" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.9 Personal Token 推进 RD 流程

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/accept" -H "Authorization: Bearer <PERSONAL_TOKEN>"
```

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/advance-stage" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"stageId\":\"<NEXT_STAGE_ID>\",\"memberIds\":[\"u_001\",\"u_002\"],\"description\":\"阶段目标说明\",\"planStartAt\":\"2026-04-20\",\"planEndAt\":\"2026-04-25\",\"stageTasks\":[{\"ownerId\":\"u_001\",\"title\":\"后端接口开发\"},{\"ownerId\":\"u_002\",\"title\":\"前端页面开发\"}]}"
```

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/progress" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"stageTaskId\":\"<STAGE_TASK_ID>\",\"progress\":40,\"note\":\"完成核心模块联调\"}"
```

### 9.10 Personal Token 创建 RD 与当前阶段任务

创建研发项时，`projectId` 由 URL 中的 `projectKey` 决定，不能从请求体覆盖。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/rd-items" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"登录功能开发\",\"stageId\":\"<STAGE_ID>\",\"type\":\"feature_dev\",\"priority\":\"medium\",\"memberIds\":[\"u_001\",\"u_002\"],\"verifierId\":\"u_003\",\"planStartAt\":\"2026-06-01\",\"planEndAt\":\"2026-06-05\",\"stageTasks\":[{\"ownerId\":\"u_001\",\"title\":\"后端接口开发\"},{\"ownerId\":\"u_002\",\"title\":\"前端页面开发\"}]}"
```

新增阶段任务时，阶段由研发项当前阶段决定，不接收 `stageKey`；`ownerIds` 必须是当前项目成员。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/rd-items/<ITEM_ID>/stage-tasks" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"补充回归验证\",\"description\":\"补充登录异常场景验证。\",\"ownerIds\":[\"u_001\",\"u_002\"],\"plannedStartAt\":\"2026-06-03\",\"plannedEndAt\":\"2026-06-04\"}"
```

### 9.11 Personal Token 创建文档

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/docs" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"自动生成文档\",\"content\":\"# 自动生成文档\\n\\n这是由脚本创建的文档。\",\"categoryId\":\"automation\",\"summary\":\"自动化创建的文档\",\"tags\":[\"auto\",\"hub-v2\"],\"status\":\"draft\",\"source\":\"cli\"}"
```

### 9.12 Personal Token 编辑文档

```bash
curl -X PATCH "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"更新后的文档标题\",\"content\":\"# 更新后的文档正文\",\"slug\":\"updated-doc-slug\",\"categoryId\":\"automation\",\"summary\":\"更新后的文档摘要\",\"tags\":[\"auto\",\"hub-v2\"],\"source\":\"cli\"}"
```

### 9.13 Personal Token 发布文档

Token API 已支持发布文档，但 MCP 当前暂未开放 docs publish tool；Agent 不应承诺可通过 MCP 发布。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>/publish" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"source\":\"cli\"}"
```

### 9.14 Project Token 读取文档

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/docs?page=1&pageSize=20&statusGroup=active" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/docs/by-slug/<DOC_SLUG>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 9.15 Personal Token 上传 Markdown 图片

上传接口使用 multipart form-data，字段：

- `file`：图片文件
- `alt`：可选，返回 Markdown 的图片替代文本

返回的 `data.markdown` 可以插入 Issue 描述、Issue 评论、RD 描述或 RD 阶段任务描述。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/uploads/markdown" -H "Authorization: Bearer <PERSONAL_TOKEN>" -F "file=@screenshot.png;type=image/png" -F "alt=登录异常截图"
```

### 9.16 Personal Token 上传受控附件文件

上传接口使用 multipart form-data，字段：

- `file`：附件文件
- `target`：`issueAttachment` 或 `taskSheetAttachment`

返回的 `data.uploadId` 仅代表文件已进入 Hub V2 上传生命周期，不代表已经挂载到 Issue、RD 或阶段任务。

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/uploads/file" -H "Authorization: Bearer <PERSONAL_TOKEN>" -F "file=@error-log.txt;type=text/plain" -F "target=issueAttachment"
```
