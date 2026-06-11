# Hub V2 Mobile API

研发项：`SLX-DES-0031`

本文档定义 Hub V2 App 需要的移动端接口契约。移动端定位为“研发协作随身端”，面向登录用户的待办、研发项、消息和个人工作台，不提供后台管理、系统设置、项目管理、Token 管理等能力。

## 1. 基础约定

### 1.1 Base URL

App 侧环境变量：

```text
EXPO_PUBLIC_API_URL=http://your-server:port/api
```

因此 App client 调用路径使用 `/admin/...`，完整服务端路径为 `/api/admin/...`。

示例：

```ts
client.get("/admin/mobile/bootstrap")
```

对应：

```http
GET /api/admin/mobile/bootstrap
```

### 1.2 鉴权边界

- 生产 App 使用登录态 Cookie Session。
- 登录继续复用现有接口：
  - `GET /api/admin/auth/login/challenge`
  - `POST /api/admin/auth/login`
  - `GET /api/admin/auth/me`
  - `POST /api/admin/auth/logout`
- App 不使用 Personal Token。
- Project Token 仅用于只读集成、调试或外部系统边界，不作为生产 App 用户鉴权方式。
- 所有 `/api/admin/mobile/*` 接口都要求 `authType=user`，未登录返回 `AUTH_UNAUTHORIZED`。

### 1.3 响应包裹

成功：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": "AUTH_UNAUTHORIZED",
  "message": "unauthorized",
  "details": null
}
```

### 1.4 通用分页

请求参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | number | `1` | 从 1 开始 |
| `pageSize` | number | `20` | 服务端按现有分页规则限制最大值 |

响应：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

### 1.5 通用错误码

| code | HTTP | 移动端处理 |
| --- | --- | --- |
| `AUTH_UNAUTHORIZED` | 401 | 清理本地登录态，跳转登录页 |
| `AUTH_FORBIDDEN` | 403 | 展示无权限页或 toast |
| `PROJECT_ACCESS_DENIED` | 403 | 展示项目无权限，回到项目选择 |
| `VALIDATION_ERROR` | 400 | 表单字段提示或 toast |
| `BAD_REQUEST` | 400 | toast 展示业务失败 |
| `NOT_FOUND` | 404 | 详情页展示已删除或不可见 |
| `INTERNAL_ERROR` | 500 | 保留当前页，展示重试入口 |

### 1.6 移动端状态映射

| 场景 | UI 状态 |
| --- | --- |
| 首次进入页面请求中 | 全页 loading |
| 列表分页加载 | 列表底部 loading |
| `items=[] && total=0` | empty state |
| 401 | 跳登录 |
| 403 | 无权限空状态或 toast |
| 404 | 详情不可见/已删除 |
| 400/409 | 表单或操作 toast |
| 500/网络失败 | error state + 重试 |

## 2. DTO 清单

### 2.1 MobileProjectSummary

```ts
type MobileProjectSummary = {
  id: string;
  projectKey: string;
  name: string;
  displayCode: string | null;
  avatarUrl: string | null;
  favoriteAt?: string | null;
};
```

### 2.2 MobileTodoItem

```ts
type MobileTodoItem = {
  id: string;
  targetType: "issue" | "rd";
  targetId: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string;
  updatedAt: string;
  assigneeName: string | null;
  summary: string | null;
  mobileRoute: string;
};
```

### 2.3 MobileTodoDetail

```ts
type MobileTodoDetail = {
  targetType: "issue" | "rd";
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  descriptionMd: string | null;
  assigneeName: string | null;
  verifierName: string | null;
  progress: number | null;
  updatedAt: string;
  timeline: MobileTimelineItem[];
  availableActions: string[];
};
```

### 2.4 MobileTimelineItem

```ts
type MobileTimelineItem = {
  id: string;
  kind: "comment" | "activity" | "progress" | "stage_task";
  authorName: string | null;
  content: string | null;
  action: string | null;
  createdAt: string;
};
```

### 2.5 MobileMessageItem

```ts
type MobileMessageItem = {
  id: string;
  messageType: "announcement" | "document" | "release" | "notification";
  category: "all" | "issue" | "rd" | "announcement" | "document" | "release";
  title: string;
  description: string | null;
  unread: boolean;
  time: string;
  projectId: string | null;
  mobileRoute: string;
};
```

## 3. 登录能力

### 3.1 获取登录挑战

`GET /api/admin/auth/login/challenge`

用途：获取登录加密所需的 `nonce` 和公钥信息。

请求参数：无。

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "nonce": "login_nonce_xxx",
    "publicKey": "-----BEGIN PUBLIC KEY-----..."
  }
}
```

错误码：`INTERNAL_ERROR`。

状态映射：全页 loading；失败时停留登录页并展示“无法连接服务器”。

### 3.2 登录

`POST /api/admin/auth/login`

用途：提交加密登录请求，服务端写入 HttpOnly Cookie。

请求参数：

```json
{
  "username": "admin",
  "nonce": "login_nonce_xxx",
  "cipherText": "base64_cipher_text",
  "remember": true
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "login success",
  "data": {
    "id": "adm_1",
    "userId": "usr_1",
    "username": "admin",
    "nickname": "管理员",
    "role": "admin"
  }
}
```

错误码：`AUTH_CHALLENGE_INVALID`、`AUTH_CHALLENGE_EXPIRED`、`AUTH_INVALID_ENCRYPTED_PASSWORD`、`AUTH_UNAUTHORIZED`、`VALIDATION_ERROR`。

状态映射：按钮 loading；失败时清理本地缓存的用户信息，保留用户名输入。

### 3.3 当前用户

`GET /api/admin/auth/me`

用途：启动时校验 Cookie Session，并刷新用户资料。

请求参数：无。

响应示例同登录用户资料。

错误码：`AUTH_UNAUTHORIZED`。

状态映射：启动页 loading；401 进入登录页。

### 3.4 退出登录

`POST /api/admin/auth/logout`

用途：清理服务端登录态和 Cookie。

请求参数：无。

响应示例：

```json
{
  "code": "OK",
  "message": "logout success",
  "data": { "ok": true }
}
```

错误码：`AUTH_UNAUTHORIZED`。

状态映射：App 可先清理本地状态并跳登录页，接口失败只记录日志。

## 4. 工作台

### 4.1 启动聚合

`GET /api/admin/mobile/bootstrap`

用途：App 启动后一次性获取当前用户、可访问项目、默认项目、未读数和移动端能力开关。

请求参数：无。

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "profile": {
      "id": "adm_1",
      "userId": "usr_1",
      "username": "admin",
      "nickname": "管理员",
      "role": "admin"
    },
    "projects": [
      {
        "id": "prj_1",
        "projectKey": "hub-v2",
        "name": "Hub V2",
        "displayCode": "HUB",
        "avatarUrl": null
      }
    ],
    "currentProject": {
      "id": "prj_1",
      "projectKey": "hub-v2",
      "name": "Hub V2",
      "displayCode": "HUB",
      "avatarUrl": null
    },
    "unreadCount": 3,
    "capabilities": {
      "canUseIssue": true,
      "canUseRd": true,
      "canUseMessages": true,
      "canUseDocuments": true
    },
    "defaultFilters": {
      "todoCategories": ["all", "issue", "rd", "verify"],
      "messageCategories": ["all", "issue", "rd", "announcement", "document", "release"]
    }
  }
}
```

错误码：`AUTH_UNAUTHORIZED`。

状态映射：启动页 loading；`projects=[]` 时进入空项目页。

### 4.2 首页 Dashboard

`GET /api/admin/mobile/dashboard`

用途：返回 4 Tab 首页所需 ViewModel，包括待办统计、待验证统计、我的研发项进度、最新公告和快捷入口。

请求参数：无。

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "stats": {
      "todoTotal": 8,
      "verifyTotal": 2,
      "assignedIssues": 3,
      "assignedRdItems": 5,
      "inProgressRdItems": 4,
      "unreadMessages": 3
    },
    "todos": [],
    "rdProgress": [],
    "announcements": [],
    "quickActions": [
      { "key": "todos", "label": "待办", "target": "/todos", "badgeCount": 8 },
      { "key": "messages", "label": "消息", "target": "/messages", "badgeCount": 3 }
    ]
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`。

状态映射：首页骨架屏；统计为 0 时展示默认空态，不视为错误。

## 5. 统一待办

### 5.1 待办列表

`GET /api/admin/mobile/todos`

用途：统一返回 Issue、RD 和待验证条目，不暴露桌面表格字段。

请求参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `category` | `all | issue | rd | verify` | 待办分类 |
| `projectId` | string | 项目过滤 |
| `status` | string | 状态过滤 |
| `priority` | string | 优先级过滤 |
| `keyword` | string | 标题或编号搜索 |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "issue:iss_1",
        "targetType": "issue",
        "targetId": "iss_1",
        "code": "ISS-12",
        "title": "登录失败",
        "status": "open",
        "priority": "high",
        "projectId": "prj_1",
        "updatedAt": "2026-06-11T08:00:00.000Z",
        "assigneeName": "张三",
        "summary": "待处理",
        "mobileRoute": "/todos/issue/iss_1"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`VALIDATION_ERROR`。

状态映射：首次进入全页 loading；下拉刷新保留旧数据；空列表展示“暂无待办”。

### 5.2 待办详情

`GET /api/admin/mobile/todos/:targetType/:targetId`

用途：返回统一详情页 ViewModel。

路径参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `targetType` | `issue | rd` | 目标类型 |
| `targetId` | string | Issue ID 或 RD Item ID |

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "targetType": "issue",
    "id": "iss_1",
    "code": "ISS-12",
    "title": "登录失败",
    "status": "open",
    "priority": "high",
    "projectId": "prj_1",
    "descriptionMd": "复现步骤...",
    "assigneeName": "张三",
    "verifierName": "李四",
    "progress": null,
    "updatedAt": "2026-06-11T08:00:00.000Z",
    "timeline": [
      {
        "id": "log_1",
        "kind": "activity",
        "authorName": "张三",
        "content": "开始处理",
        "action": "start",
        "createdAt": "2026-06-11T08:10:00.000Z"
      }
    ],
    "availableActions": ["start", "resolve", "close"]
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`ISSUE_NOT_FOUND`、`RD_ITEM_NOT_FOUND`、`VALIDATION_ERROR`。

状态映射：详情骨架屏；404 展示“内容不存在或已无权限”。

### 5.3 Issue 评论

`POST /api/admin/mobile/issues/:issueId/comments`

用途：复用 Issue 评论能力，返回移动端可直接追加到评论流的 DTO。

请求参数：

```json
{
  "content": "我已复现，补充日志如下...",
  "mentions": ["usr_1"]
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "mobile issue comment created",
  "data": {
    "id": "cmt_1",
    "issueId": "iss_1",
    "content": "我已复现，补充日志如下...",
    "createdAt": "2026-06-11T08:20:00.000Z"
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`ISSUE_NOT_FOUND`、`VALIDATION_ERROR`。

状态映射：发送按钮 loading；成功后追加评论并刷新详情；失败保留输入内容。

### 5.4 Issue 操作

`POST /api/admin/mobile/issues/:issueId/actions`

用途：按现有 Issue 流转权限执行状态动作。

请求参数：

```json
{
  "action": "resolve",
  "note": "已修复",
  "reason": "fixed"
}
```

`action` 可选值：`start`、`wait_update`、`resolve`、`verify`、`reopen`、`close`。

响应示例：返回更新后的 Issue 实体。

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`ISSUE_NOT_FOUND`、`ISSUE_INVALID_TRANSITION`、`ISSUE_START_FORBIDDEN`、`ISSUE_RESOLVE_FORBIDDEN`、`ISSUE_VERIFY_FORBIDDEN`、`ISSUE_REOPEN_FORBIDDEN`、`ISSUE_CLOSE_FORBIDDEN`。

状态映射：操作按钮 loading；成功后刷新详情和待办列表；失败 toast。

### 5.5 RD 进度

`POST /api/admin/mobile/rd-items/:itemId/progress`

用途：更新研发项进度，可关联阶段任务。

请求参数：

```json
{
  "progress": 60,
  "note": "联调中",
  "stageTaskId": "task_1"
}
```

响应示例：返回更新后的 RD Item 实体。

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`RD_ITEM_NOT_FOUND`、`RD_PROGRESS_FORBIDDEN`、`VALIDATION_ERROR`。

状态映射：进度提交按钮 loading；成功后刷新详情进度和时间线。

### 5.6 RD 操作

`POST /api/admin/mobile/rd-items/:itemId/actions`

用途：按现有 RD 流转权限执行状态动作。

请求参数：

```json
{
  "action": "block",
  "reason": "等待接口联调",
  "note": "后端接口预计明天完成"
}
```

`action` 可选值：`start`、`block`、`resume`、`complete`、`accept`、`reopen`、`close`。

响应示例：返回更新后的 RD Item 实体。

错误码：`AUTH_UNAUTHORIZED`、`PROJECT_ACCESS_DENIED`、`RD_ITEM_NOT_FOUND`、`RD_INVALID_TRANSITION`、`RD_PROGRESS_FORBIDDEN`、`RD_BLOCK_FORBIDDEN`、`RD_ACCEPT_FORBIDDEN`、`RD_CLOSE_FORBIDDEN`。

状态映射：操作按钮 loading；成功后刷新详情、研发项进度和待办列表。

## 6. 消息中心

### 6.1 消息列表

`GET /api/admin/mobile/messages`

用途：统一返回通知、公告、文档、发布记录的移动端消息列表。

请求参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `category` | `all | issue | rd | announcement | document | release` | 消息分类 |
| `unreadOnly` | boolean | 只看未读 |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "ntf_1",
        "messageType": "notification",
        "category": "issue",
        "title": "Issue 分配给你",
        "description": "登录失败",
        "unread": true,
        "time": "2026-06-11T08:00:00.000Z",
        "projectId": "prj_1",
        "mobileRoute": "/messages/notification/ntf_1"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "unreadTotal": 3
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`VALIDATION_ERROR`。

状态映射：列表 loading；空列表展示“暂无消息”；`unreadTotal` 用于 Tab badge。

### 6.2 消息详情

`GET /api/admin/mobile/messages/:messageType/:id`

用途：统一 Markdown 详情，供消息中心进入公告、文档、发布记录或通知详情。

路径参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `messageType` | `announcement | document | release | notification` | 消息类型 |
| `id` | string | 目标 ID |

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "ann_1",
    "messageType": "announcement",
    "title": "系统维护通知",
    "markdown": "今晚 22:00 维护...",
    "projectId": null,
    "publishedAt": "2026-06-11T08:00:00.000Z",
    "unread": false
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`ANNOUNCEMENT_NOT_FOUND`、`DOCUMENT_NOT_FOUND`、`RELEASE_NOT_FOUND`、`NOT_FOUND`、`VALIDATION_ERROR`。

状态映射：详情 loading；404 展示“消息不存在或已无权限”。

### 6.3 标记已读

`POST /api/admin/mobile/messages/read`

用途：复用通知已读能力，支持单条、批量和全部已读。

请求参数：

```json
{
  "notificationIds": ["ntf_1", "ntf_2"],
  "all": false
}
```

全部已读：

```json
{
  "all": true
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "mobile messages marked read",
  "data": {
    "updated": 2,
    "unreadCount": 1
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`VALIDATION_ERROR`。

状态映射：乐观更新已读状态；失败时刷新消息列表修正状态。

## 7. 我的

我的页优先使用以下已有接口，不新增移动端专用资料接口：

| 能力 | Method | Path | 说明 |
| --- | --- | --- | --- |
| 当前用户 | GET | `/api/admin/auth/me` | 展示头像、昵称、角色 |
| 修改资料 | PATCH | `/api/admin/auth/profile` | 修改昵称、邮箱、手机号、备注 |
| 修改头像 | PATCH | `/api/admin/auth/avatar` | 绑定已有上传文件 |
| 退出登录 | POST | `/api/admin/auth/logout` | 清理 Cookie Session |

错误码：`AUTH_UNAUTHORIZED`、`AUTH_FORBIDDEN`、`VALIDATION_ERROR`。

状态映射：资料卡骨架屏；保存按钮 loading；保存成功更新本地用户缓存。

## 8. 设置与连接测试

### 8.1 连接测试

`GET /api/admin/mobile/connection`

用途：设置页测试服务端连接、登录态和项目可用性。

请求参数：无。

响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "app": "hub-v2",
    "env": "production",
    "authenticated": true,
    "profile": {
      "id": "adm_1",
      "userId": "usr_1",
      "username": "admin",
      "nickname": "管理员",
      "role": "admin"
    },
    "projectCount": 3,
    "currentProject": {
      "id": "prj_1",
      "projectKey": "hub-v2",
      "name": "Hub V2",
      "displayCode": "HUB",
      "avatarUrl": null
    }
  }
}
```

错误码：`AUTH_UNAUTHORIZED`、`INTERNAL_ERROR`。

状态映射：测试按钮 loading；401 显示“登录已失效”；网络失败显示“服务器不可达”。

## 9. 接口缺口清单

| 缺口 | 状态 | 处理 |
| --- | --- | --- |
| 移动端启动聚合 | 已补 | `GET /api/admin/mobile/bootstrap` |
| 移动端首页 ViewModel | 已补 | `GET /api/admin/mobile/dashboard` |
| 统一待办列表 | 已补 | `GET /api/admin/mobile/todos` |
| 统一待办详情 | 已补 | `GET /api/admin/mobile/todos/:targetType/:targetId` |
| Issue 评论快捷入口 | 已补 | `POST /api/admin/mobile/issues/:issueId/comments` |
| Issue 状态动作聚合 | 已补 | `POST /api/admin/mobile/issues/:issueId/actions` |
| RD 进度更新聚合 | 已补 | `POST /api/admin/mobile/rd-items/:itemId/progress` |
| RD 状态动作聚合 | 已补 | `POST /api/admin/mobile/rd-items/:itemId/actions` |
| 移动端消息列表 | 已补 | `GET /api/admin/mobile/messages` |
| 统一消息详情 | 已补 | `GET /api/admin/mobile/messages/:messageType/:id` |
| 消息已读 | 已补 | `POST /api/admin/mobile/messages/read` |
| 设置页连接测试 | 已补 | `GET /api/admin/mobile/connection` |
| 上传附件 | 复用现有上传接口 | 本 RD 不新增移动端上传聚合 |
| 项目管理/Token 管理 | 不开放 | 移动端不提供后台管理能力 |

## 10. 实现顺序建议

1. 接入 `bootstrap` 和登录态校验，完成启动、项目选择和全局 badge。
2. 接入 `dashboard`，完成 4 Tab 首页数据骨架。
3. 接入 `todos` 列表和详情，只读链路先闭环。
4. 接入 Issue/RD 评论、进度和状态动作，补充操作后的刷新策略。
5. 接入 `messages`、消息详情和已读，完成消息中心。
6. 接入 `connection`，完成设置页连接测试。

## 11. 服务端实现说明

- 新增接口注册在 `/api/admin/mobile/*`。
- 服务端模块只做移动端 ViewModel 包装，不新增数据库表。
- 服务端复用现有 `auth`、`dashboard`、`issue`、`rd`、`notifications`、`document`、`announcement`、`release`、`project` 服务。
- 不改变桌面 Web API 行为。
- Project Token、Personal Token、系统设置、项目管理等后台能力不纳入移动端生产接口。
