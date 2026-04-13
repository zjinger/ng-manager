# 13 Hub V2 Token 体系与 webapp 读写接入方案

最后更新：2026-04-13

## 1. 背景与目标

`ng-manager/webapp` 需要在不进入 Hub 管理端的前提下，直接读取并操作 Hub V2 的 Issue 与 RD 数据。  
本方案用于冻结 Token 体系、接口口径、权限口径与审计口径，直接指导开发与测试。

目标如下：

- 提供稳定的 webapp 接入链路
- 统一 Token 体系与权限模型
- 统一 Issue 与 RD 的读写方案

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
出参：`{ baseUrl, tokenConfigured, projectKey }`

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
- 二进制直连读取场景可通过 packages/server 代理：
  - `GET /api/client/hub-token/projects/:projectId/issues/:issueId/attachments/:attachmentId/raw`
  - `GET /api/client/hub-token/projects/:projectId/issues/:issueId/uploads/:uploadId/raw`

---

## 5.2 读取接口

Issue：

- `GET /api/token/projects/:projectKey/issues`
- `GET /api/token/projects/:projectKey/issues/:issueId`
- `GET /api/token/projects/:projectKey/issues/:issueId/logs`
- `GET /api/token/projects/:projectKey/issues/:issueId/comments`
- `GET /api/token/projects/:projectKey/issues/:issueId/participants`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments/:attachmentId/raw`（显式附件展示）
- `GET /api/token/projects/:projectKey/issues/:issueId/uploads/:uploadId/raw`（Issue 描述中的 Markdown 图片展示）
- `GET /api/token/projects/:projectKey/members`（用于评论 @ 成员候选）

说明：

- `attachmentId` 对应 `issue_attachments.id`，仅用于显式附件
- `uploadId` 对应 Markdown 图片上传后的 `uploads.id`
- Markdown 图片不要求存在 `issue_attachment` 记录，但要求该 `uploadId` 已被当前 Issue 描述引用，且上传分类为 `markdown`

RD：

- `GET /api/token/projects/:projectKey/rd-stages`（研发阶段字典）
- `GET /api/token/projects/:projectKey/rd-items`
- `GET /api/token/projects/:projectKey/rd-items/:itemId`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/logs`

Feedback：
- `GET /api/token/projects/:projectKey/feedbacks`
- `GET /api/token/projects/:projectKey/feedbacks/:feedbackId`

---

## 5.3 写入接口

Issue：

- `POST /api/personal/projects/:projectKey/issues/:issueId/comments`
- `POST /api/personal/projects/:projectKey/issues/:issueId/assign`
- `POST /api/personal/projects/:projectKey/issues/:issueId/claim`
- `POST /api/personal/projects/:projectKey/issues/:issueId/start`
- `POST /api/personal/projects/:projectKey/issues/:issueId/wait-update`
- `POST /api/personal/projects/:projectKey/issues/:issueId/resolve`
- `POST /api/personal/projects/:projectKey/issues/:issueId/verify`
- `POST /api/personal/projects/:projectKey/issues/:issueId/reopen`
- `POST /api/personal/projects/:projectKey/issues/:issueId/close`
- `POST /api/personal/projects/:projectKey/issues/:issueId/participants`
- `DELETE /api/personal/projects/:projectKey/issues/:issueId/participants/:participantId`

RD：

- `POST /api/personal/projects/:projectKey/rd-items/:itemId/start`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/block`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/resume`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/complete`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/progress`
- `PATCH /api/personal/projects/:projectKey/rd-items/:itemId`
- `DELETE /api/personal/projects/:projectKey/rd-items/:itemId`

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
| Issue | 评论 | `issue:comment:write` |
| Issue | 状态流转 | `issue:transition:write` |
| Issue | 指派与认领 | `issue:assign:write` |
| Issue | 协作人管理 | `issue:participant:write` |
| RD | 列表与详情 | `rd:read` |
| Feedback | 列表与详情 | `feedbacks:read` |
| RD | 状态流转与进度 | `rd:transition:write` |
| RD | 编辑基础信息 | `rd:edit:write` |
| RD | 删除 | `rd:delete:write` |

### 6.2 判定规则

操作放行需同时满足：

1. Token 有效
2. Scope 允许
3. 业务角色允许

角色权限基线：

- Issue 参照 [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)
- RD 参照 [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)

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

补充规则：

- RD 进度更新为 `100%`，状态变更为 `done`
- 已完成项进度调整到 `0~99`，状态回到 `doing`

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

---

## 9. 审计方案

关键写操作日志字段：

- `action`
- `projectId`
- `entityId`
- `actorUserId`
- `actorName`
- `tokenId`
- `before`
- `after`
- `createdAt`

说明：

- `entityId` 在 Issue 场景为 `issueId`，在 RD 场景为 `rdItemId`
- 日志文案统一中文

---

## 10. 实施计划

### 阶段 1

- 打通读取链路
- webapp 可读取 Issue 与 RD

### 阶段 2

- 落地 Personal Token 管理接口
- 落地 `/api/personal` 写接口
- 落地审计字段

### 阶段 3

- webapp 写操作切换到 Personal Token
- Project Token 收敛为只读
- 完成回归与灰度发布

---

## 11. 验收标准

- Project Token 仅读，Personal Token 负责写
- Issue 与 RD 写操作可定位到操作者身份
- Scope 不匹配或角色不匹配返回 `403`
- webapp 只传 `projectId` + 业务相对路径，server 负责 `projectKey` 解析、token 鉴权与转发细节

---

## 12. Curl 验证示例

### 12.1 Personal Token 写评论

```bash
curl -X POST "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/comments" -H "Authorization: Bearer <PERSONAL_TOKEN>" -H "Content-Type: application/json" -d "{\"content\":\"[PTK验证] 评论写入测试\"}"
```

### 12.2 Project Token 读取 Issue 列表

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/issues?page=1&pageSize=20" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 12.3 Project Token 读取 Issue Markdown 图片

```bash
curl -X GET "http://<HUB_V2_HOST>/api/token/projects/<PROJECT_KEY>/issues/<ISSUE_ID>/uploads/<UPLOAD_ID>/raw" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

### 12.4 Personal Token 获取身份与能力

```bash
curl -X GET "http://<HUB_V2_HOST>/api/personal/me" -H "Authorization: Bearer <PERSONAL_TOKEN>"
```

```bash
curl -X GET "http://<HUB_V2_HOST>/api/personal/projects/<PROJECT_KEY>/capabilities" -H "Authorization: Bearer <PERSONAL_TOKEN>"
```
