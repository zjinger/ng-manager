# apps/hub-v2 API 设计文档

最后更新：2026-03-20

## 1. 文档目的

本文档用于定义 `apps/hub-v2` 的 API 设计规范，包括：

- HTTP API 设计原则
- 统一响应结构
- 错误码规范
- 鉴权与上下文传递方式
- 分页、筛选和动作型接口规范
- WebSocket 事件模型

本文档服务于以下目标：

- 让前后端对接口风格有统一约定
- 让模块在编码前确定资源模型和动作边界
- 让 API 能与 `Contract`、`RequestContext`、`EventBus` 设计保持一致

关联文档：

1. [01-hub-redesign-implementation-plan.md](d:/ng-manager/apps/hub-v2/docs/01-hub-redesign-implementation-plan.md)
2. [02-architecture-design.md](d:/ng-manager/apps/hub-v2/docs/02-architecture-design.md)
3. [03-database-design.md](d:/ng-manager/apps/hub-v2/docs/03-database-design.md)

---

## 2. 设计目标

API 设计遵循以下目标：

1. 保持资源风格一致
2. 让管理端与公共读取端边界清晰
3. 让动作型接口和资源型接口可以共存，但语义明确
4. 让前端易于封装 feature API client
5. 让未来 CLI / SDK / Job 复用同一套业务语义

---

## 3. 基本约定

### 3.1 前缀约定

管理端接口：

```text
/api/admin/*
```

公共读取接口：

```text
/api/public/*
```

### 3.2 资源风格

推荐优先使用资源型路径：

```text
GET    /api/admin/projects
POST   /api/admin/projects
GET    /api/admin/projects/:projectId
PATCH  /api/admin/projects/:projectId
```

对于流程动作，允许使用子动作路径：

```text
POST /api/admin/projects/:projectId/issues/:issueId/assign
POST /api/admin/projects/:projectId/issues/:issueId/start
POST /api/admin/projects/:projectId/issues/:issueId/resolve
POST /api/admin/projects/:projectId/issues/:issueId/verify
POST /api/admin/projects/:projectId/issues/:issueId/reopen
POST /api/admin/projects/:projectId/issues/:issueId/close
```

### 3.3 命名原则

1. URL 使用复数资源名
2. 尽量避免动词路径，流程动作除外
3. 参数名统一使用 camelCase
4. 响应体字段统一使用 camelCase

---

## 4. 统一响应结构

### 4.1 成功响应

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

### 4.2 失败响应

```json
{
  "code": "AUTH_UNAUTHORIZED",
  "message": "unauthorized",
  "details": {}
}
```

### 4.3 推荐 TypeScript 类型

```ts
export interface ApiSuccessResponse<T> {
  code: 'OK';
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 4.4 响应原则

1. 所有成功响应统一返回 `code/message/data`
2. 所有失败响应统一返回 `code/message`
3. 不在 HTTP body 中返回 `success: true/false`
4. HTTP 状态码与 `code` 同时存在，不能二选一

---

## 5. HTTP 状态码与错误码规范

### 5.1 HTTP 状态码原则

推荐使用：

- `200`：普通成功
- `201`：创建成功
- `204`：无内容返回的删除或空成功
- `400`：参数错误 / 非法动作
- `401`：未认证
- `403`：无权限
- `404`：资源不存在
- `409`：冲突
- `422`：语义校验失败
- `500`：内部错误

### 5.2 错误码建议

通用错误码：

- `BAD_REQUEST`
- `VALIDATION_ERROR`
- `AUTH_UNAUTHORIZED`
- `AUTH_FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

业务错误码示例：

- `PROJECT_NOT_FOUND`
- `PROJECT_ACCESS_DENIED`
- `ISSUE_NOT_FOUND`
- `ISSUE_INVALID_STATUS`
- `ISSUE_ASSIGN_FAILED`
- `RD_ITEM_NOT_FOUND`
- `RD_INVALID_STATUS`
- `ANNOUNCEMENT_NOT_FOUND`

### 5.3 错误码原则

1. 错误码必须稳定，不能依赖中文 message
2. 业务错误码优先于泛化错误码
3. 前端逻辑应尽量依赖 `code`，不是依赖 message

---

## 6. 鉴权与上下文

### 6.1 管理端鉴权

管理端接口使用登录态 Cookie：

```text
Cookie: ngm_hub_token=<jwt>
```

### 6.2 公共接口

`/api/public/*` 默认允许匿名访问，但可针对少量接口引入访问限制。

### 6.3 服务端上下文构造

API 层负责从以下信息构造 `RequestContext`：

- 登录账号
- 业务用户
- 角色集合
- 当前请求可访问的项目范围
- `requestId`
- 客户端 IP

### 6.4 鉴权原则

1. 路由负责认证入口控制
2. 细粒度权限在 service + policy 层完成
3. 不允许仅靠前端隐藏按钮实现权限控制

---

## 7. 分页、筛选与排序规范

### 7.1 分页参数

统一推荐参数：

```text
page
pageSize
```

### 7.2 分页响应

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

推荐类型：

```ts
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

### 7.3 筛选参数

推荐通用筛选字段：

- `keyword`
- `status`
- `type`
- `priority`
- `projectId`
- `assigneeId`
- `reporterId`
- `reviewerId`

### 7.4 排序

当前阶段推荐后端固定默认排序，避免开放过多动态排序参数。

默认建议：

- 列表默认按 `updatedAt desc`
- 内容类数据可按 `publishAt desc`

---

## 8. 路由结构设计

### 8.1 Auth

```text
GET  /api/admin/auth/login/challenge
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/auth/me
POST /api/admin/auth/change-password
```

### 8.2 Users

```text
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:userId
PATCH  /api/admin/users/:userId
```

### 8.3 Projects

```text
GET    /api/admin/projects
POST   /api/admin/projects
GET    /api/admin/projects/:projectId
PATCH  /api/admin/projects/:projectId
```

项目成员：

```text
GET    /api/admin/projects/:projectId/members
POST   /api/admin/projects/:projectId/members
PATCH  /api/admin/projects/:projectId/members/:memberId
DELETE /api/admin/projects/:projectId/members/:memberId
```

### 8.4 Uploads

```text
POST /api/admin/uploads
GET  /api/admin/uploads/:uploadId
GET  /api/public/uploads/:uploadId
```

### 8.5 Announcements

管理端：

```text
GET    /api/admin/announcements
POST   /api/admin/announcements
GET    /api/admin/announcements/:announcementId
PATCH  /api/admin/announcements/:announcementId
POST   /api/admin/announcements/:announcementId/publish
POST   /api/admin/announcements/:announcementId/archive
POST   /api/admin/announcements/:announcementId/read
POST   /api/admin/announcements/read-all
```

公共端：

```text
GET /api/public/announcements
GET /api/public/announcements/:announcementId
```

### 8.6 Documents

管理端：

```text
GET    /api/admin/documents
POST   /api/admin/documents
GET    /api/admin/documents/:documentId
PATCH  /api/admin/documents/:documentId
POST   /api/admin/documents/:documentId/publish
POST   /api/admin/documents/:documentId/archive
```

公共端：

```text
GET /api/public/documents
GET /api/public/documents/:documentId
```

### 8.7 Releases

管理端：

```text
GET    /api/admin/releases
POST   /api/admin/releases
GET    /api/admin/releases/:releaseId
PATCH  /api/admin/releases/:releaseId
POST   /api/admin/releases/:releaseId/publish
```

公共端：

```text
GET /api/public/releases/latest
GET /api/public/releases
```

### 8.8 Shared Config

管理端：

```text
GET    /api/admin/shared-configs
POST   /api/admin/shared-configs
GET    /api/admin/shared-configs/:configId
PATCH  /api/admin/shared-configs/:configId
```

公共端：

```text
GET /api/public/shared-configs
```

### 8.9 Issues

管理端：

```text
GET    /api/admin/projects/:projectId/issues
POST   /api/admin/projects/:projectId/issues
GET    /api/admin/projects/:projectId/issues/:issueId
PATCH  /api/admin/projects/:projectId/issues/:issueId
```

动作接口：

```text
POST /api/admin/projects/:projectId/issues/:issueId/assign
POST /api/admin/projects/:projectId/issues/:issueId/claim
POST /api/admin/projects/:projectId/issues/:issueId/start
POST /api/admin/projects/:projectId/issues/:issueId/resolve
POST /api/admin/projects/:projectId/issues/:issueId/verify
POST /api/admin/projects/:projectId/issues/:issueId/reopen
POST /api/admin/projects/:projectId/issues/:issueId/close
```

附属资源：

```text
GET    /api/admin/projects/:projectId/issues/:issueId/comments
POST   /api/admin/projects/:projectId/issues/:issueId/comments
GET    /api/admin/projects/:projectId/issues/:issueId/attachments
POST   /api/admin/projects/:projectId/issues/:issueId/attachments
DELETE /api/admin/projects/:projectId/issues/:issueId/attachments/:attachmentId
GET    /api/admin/projects/:projectId/issues/:issueId/participants
POST   /api/admin/projects/:projectId/issues/:issueId/participants
DELETE /api/admin/projects/:projectId/issues/:issueId/participants/:participantId
GET    /api/admin/projects/:projectId/issues/:issueId/logs
```

### 8.10 RD

阶段管理：

```text
GET    /api/admin/projects/:projectId/rd/stages
POST   /api/admin/projects/:projectId/rd/stages
PATCH  /api/admin/projects/:projectId/rd/stages/:stageId
DELETE /api/admin/projects/:projectId/rd/stages/:stageId
```

研发项：

```text
GET    /api/admin/projects/:projectId/rd/items
POST   /api/admin/projects/:projectId/rd/items
GET    /api/admin/projects/:projectId/rd/items/:itemId
PATCH  /api/admin/projects/:projectId/rd/items/:itemId
DELETE /api/admin/projects/:projectId/rd/items/:itemId
```

动作接口：

```text
POST /api/admin/projects/:projectId/rd/items/:itemId/start
POST /api/admin/projects/:projectId/rd/items/:itemId/block
POST /api/admin/projects/:projectId/rd/items/:itemId/resume
POST /api/admin/projects/:projectId/rd/items/:itemId/finish
POST /api/admin/projects/:projectId/rd/items/:itemId/accept
POST /api/admin/projects/:projectId/rd/items/:itemId/close
POST /api/admin/projects/:projectId/rd/items/:itemId/cancel
POST /api/admin/projects/:projectId/rd/items/:itemId/progress
POST /api/admin/projects/:projectId/rd/items/:itemId/comment
GET  /api/admin/projects/:projectId/rd/items/:itemId/logs
```

### 8.11 Dashboard

```text
GET /api/admin/dashboard/home
GET /api/admin/dashboard/preferences
PUT /api/admin/dashboard/preferences
```

### 8.12 Feedback

如 v2 保留该模块：

```text
POST /api/public/feedback
GET  /api/admin/feedbacks
GET  /api/admin/feedbacks/:feedbackId
PATCH /api/admin/feedbacks/:feedbackId
```

---

## 9. 请求体与 DTO 设计原则

### 9.1 原则

1. 路由层接收 DTO，不直接暴露数据库结构
2. DTO 使用 `zod` 校验
3. 动作型接口的 body 只包含本动作必要参数

### 9.2 示例

Issue 指派：

```json
{
  "assigneeId": "usr_001"
}
```

Issue 解决：

```json
{
  "comment": "已修复并提交验证",
  "resolutionSummary": "修复接口空值处理"
}
```

RD 进度更新：

```json
{
  "progress": 80
}
```

---

## 10. Contract 与 API 的关系

### 10.1 映射原则

HTTP API 是协议层，Contract 是业务层入口。

关系如下：

```text
HTTP Route
  -> schema parse
  -> RequestContext build
  -> contract call
  -> response mapping
```

### 10.2 约束

1. Route 不直接写业务逻辑
2. Route 不直接访问 repo
3. Route 不返回 repo 实体内部结构

---

## 11. WebSocket 设计

### 11.1 目标

WS 用于实时通知客户端“有事发生”，不承载完整业务事实同步。

### 11.2 连接设计

推荐路径：

```text
/ws
```

握手后基于当前登录身份确定：

- 是否已认证
- 可订阅哪些项目范围

### 11.3 事件模型

推荐统一事件结构：

```ts
export interface HubWsEvent {
  type: string;
  scope: 'global' | 'project';
  projectId?: string;
  entityType: 'announcement' | 'document' | 'release' | 'issue' | 'rd' | 'system';
  entityId: string;
  action: string;
  message: string;
  createdAt: string;
  actorId?: string;
  payload?: Record<string, unknown>;
}
```

### 11.4 事件来源

事件不直接来自 route，也不直接来自 ws manager。

正确路径：

```text
Command Service -> EventBus -> WS Subscriber -> Client
```

### 11.5 推荐事件枚举

- `announcement.published`
- `announcement.updated`
- `document.published`
- `document.updated`
- `release.published`
- `issue.created`
- `issue.updated`
- `issue.commented`
- `rd.created`
- `rd.updated`
- `broadcast.sent`

### 11.6 事件消费原则

1. 前端收到事件后，根据需要再次拉取 HTTP 详情
2. 前端不能把 WS payload 当成唯一事实来源
3. 事件 payload 应尽量简短

---

## 12. 前端 API Client 设计建议

### 12.1 按 Feature 拆分

推荐结构：

```text
features/
  issues/data/issues.api.ts
  rd/data/rd.api.ts
  dashboard/data/dashboard.api.ts
```

### 12.2 API Client 约束

1. 一个 feature 一个 API client
2. 公共 `ApiClient` 只承载底层 GET/POST/PATCH/DELETE
3. 业务 URL 和 DTO 映射放在 feature API client 中

### 12.3 示例

```ts
export class IssuesApi {
  list(projectId: string, query: ListIssuesQuery) {}
  create(projectId: string, input: CreateIssueInput) {}
  assign(projectId: string, issueId: string, input: AssignIssueInput) {}
}
```

---

## 13. 编码前必须冻结的 API 设计项

开始正式编码前，以下项目必须冻结：

1. 公共前缀规范
2. 统一响应结构
3. 错误码集合
4. 分页结构
5. Issue 动作接口集合
6. RD 动作接口集合
7. Dashboard 聚合接口集合
8. WS 事件结构与枚举

---

## 14. 验收标准

API 设计进入可编码状态，至少满足：

1. 所有核心模块都有稳定资源路径
2. 流程动作接口已单独定义
3. 响应结构前后端一致
4. 错误码可支持前端分支处理
5. WS 事件模型和 HTTP 事实模型职责清晰

---

## 15. 后续关联文档

建议继续编写：

1. `05-implementation-roadmap.md`
