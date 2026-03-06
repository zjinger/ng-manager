# ngm-hub Server API 文档

本文档面向 `ngm-hub-server` 当前 MVP 阶段的接口能力，覆盖：

- 认证与管理员会话
- 公告管理
- 文档管理
- 共享配置管理
- 反馈提交与处理
- 公共读取接口

---

## 1. 基本说明

### 1.1 Base URL

开发环境示例：

```text
http://127.0.0.1:19527
```

接口前缀分为两类：

- 公共接口：`/api/public/*`
- 管理接口：`/api/admin/*`

### 1.2 认证方式

管理接口采用：

- `@fastify/jwt`
- `HttpOnly Cookie`
- Cookie 名默认：`ngm_hub_token`

登录成功后，服务端会通过 `Set-Cookie` 写入管理员登录态。
后续访问受保护的 `/api/admin/*` 业务接口时，需要自动携带该 Cookie。

### 1.3 统一响应格式

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "request validation failed",
  "details": {}
}
```

### 1.4 常见状态码

- `200`：成功
- `201`：创建成功
- `400`：参数错误 / 业务校验失败
- `401`：未登录或认证失效
- `403`：无权限或用户被禁用
- `404`：资源不存在
- `409`：唯一键冲突
- `500`：服务端错误

---

## 2. 认证接口

### 2.1 管理员登录

**POST** `/api/admin/auth/login`

#### 请求体

```json
{
  "username": "admin",
  "password": "admin123456"
}
```

#### 响应示例

```json
{
  "code": "OK",
  "message": "login success",
  "data": {
    "id": "adm_xxxxxxxx",
    "username": "admin",
    "nickname": "Administrator",
    "status": "active",
    "mustChangePassword": true,
    "lastLoginAt": "2026-03-06T08:00:00.000Z",
    "createdAt": "2026-03-06T07:00:00.000Z",
    "updatedAt": "2026-03-06T08:00:00.000Z"
  }
}
```

#### 说明

- 登录成功后返回管理员资料。
- 同时返回 `Set-Cookie`，写入登录态。
- `mustChangePassword=true` 表示应在管理端强制进入改密流程。

---

### 2.2 获取当前登录管理员信息

**GET** `/api/admin/auth/me`

#### 鉴权

需要已登录 Cookie。

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "adm_xxxxxxxx",
    "username": "admin",
    "nickname": "Administrator",
    "status": "active",
    "mustChangePassword": false,
    "lastLoginAt": "2026-03-06T08:00:00.000Z",
    "createdAt": "2026-03-06T07:00:00.000Z",
    "updatedAt": "2026-03-06T08:10:00.000Z"
  }
}
```

---

### 2.3 修改密码

**POST** `/api/admin/auth/change-password`

#### 鉴权

需要已登录 Cookie。

#### 请求体

```json
{
  "oldPassword": "admin123456",
  "newPassword": "YourNewPassword123"
}
```

#### 响应示例

```json
{
  "code": "OK",
  "message": "password changed",
  "data": {
    "id": "adm_xxxxxxxx",
    "username": "admin",
    "nickname": "Administrator",
    "status": "active",
    "mustChangePassword": false,
    "lastLoginAt": "2026-03-06T08:00:00.000Z",
    "createdAt": "2026-03-06T07:00:00.000Z",
    "updatedAt": "2026-03-06T08:10:00.000Z"
  }
}
```

#### 错误码

- `AUTH_INVALID_OLD_PASSWORD`
- `AUTH_PASSWORD_NOT_CHANGED`
- `AUTH_USER_NOT_FOUND`
- `AUTH_USER_DISABLED`

---

### 2.4 登出

**POST** `/api/admin/auth/logout`

#### 鉴权

需要已登录 Cookie。

#### 响应示例

```json
{
  "code": "OK",
  "message": "logout success",
  "data": {
    "ok": true
  }
}
```

---

## 3. 公共接口

---

### 3.1 健康检查

**GET** `/api/public/health`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ok": true,
    "service": "ngm-hub-server",
    "version": "0.1.0",
    "time": "2026-03-06T08:00:00.000Z"
  }
}
```

---

### 3.2 提交反馈

**POST** `/api/public/feedbacks`

#### 请求体

```json
{
  "source": "desktop",
  "category": "bug",
  "title": "任务执行窗口偶发卡死",
  "content": "点击停止后界面未刷新",
  "contact": "zjing",
  "clientName": "ng-manager desktop",
  "clientVersion": "0.1.0",
  "osInfo": "Windows 11"
}
```

#### 字段说明

- `source`: `desktop | cli | web`
- `category`: `bug | suggestion | feature | other`

#### 响应示例

```json
{
  "code": "OK",
  "message": "feedback submitted",
  "data": {
    "id": "fb_xxxxxxxx",
    "source": "desktop",
    "category": "bug",
    "title": "任务执行窗口偶发卡死",
    "content": "点击停止后界面未刷新",
    "contact": "zjing",
    "clientName": "ng-manager desktop",
    "clientVersion": "0.1.0",
    "osInfo": "Windows 11",
    "status": "open",
    "createdAt": "2026-03-06T08:00:00.000Z",
    "updatedAt": "2026-03-06T08:00:00.000Z"
  }
}
```

---

### 3.3 获取公告列表

**GET** `/api/public/announcements`

#### Query 参数

- `scope`: `all | desktop | cli`，默认 `all`
- `limit`: 1-100，默认 `10`

#### 请求示例

```text
GET /api/public/announcements?scope=desktop&limit=10
```

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": [
    {
      "id": "ann_xxxxxxxx",
      "title": "ng-manager 0.1.0 发布",
      "summary": "桌面端首个内测版本",
      "contentMd": "# 发布说明\n\n已支持任务执行与项目管理基础能力。",
      "scope": "desktop",
      "pinned": true,
      "status": "published",
      "publishAt": "2026-03-06T08:00:00.000Z",
      "expireAt": null,
      "createdBy": "admin",
      "createdAt": "2026-03-06T07:30:00.000Z",
      "updatedAt": "2026-03-06T08:00:00.000Z"
    }
  ]
}
```

#### 可见性规则

仅返回满足以下条件的公告：

- `status = published`
- 未过期：`expireAt` 为空或晚于当前时间
- `scope` 与请求 scope 匹配

---

### 3.4 获取公告详情

**GET** `/api/public/announcements/:id`

#### Query 参数

- `scope`: `all | desktop | cli`，默认 `all`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "ann_xxxxxxxx",
    "title": "ng-manager 0.1.0 发布",
    "summary": "桌面端首个内测版本",
    "contentMd": "# 发布说明\n\n已支持任务执行与项目管理基础能力。",
    "scope": "desktop",
    "pinned": true,
    "status": "published",
    "publishAt": "2026-03-06T08:00:00.000Z",
    "expireAt": null,
    "createdBy": "admin",
    "createdAt": "2026-03-06T07:30:00.000Z",
    "updatedAt": "2026-03-06T08:00:00.000Z"
  }
}
```

---

### 3.5 获取已发布文档列表

**GET** `/api/public/documents`

#### Query 参数

- `category`: `guide | faq | release-note | spec | policy | other`
- `keyword`: 关键字
- `page`: 默认 `1`
- `pageSize`: 默认 `20`，最大 `100`

#### 请求示例

```text
GET /api/public/documents?page=1&pageSize=10&category=guide
```

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "doc_xxxxxxxx",
        "slug": "getting-started",
        "title": "快速开始",
        "category": "guide",
        "summary": "ngm-hub 的接入说明",
        "status": "published",
        "version": "0.1.0",
        "createdBy": "admin",
        "createdAt": "2026-03-06T08:00:00.000Z",
        "updatedAt": "2026-03-06T08:10:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
}
```

---

### 3.6 按 slug 获取已发布文档详情

**GET** `/api/public/documents/:slug`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "doc_xxxxxxxx",
    "slug": "getting-started",
    "title": "快速开始",
    "category": "guide",
    "summary": "ngm-hub 的接入说明",
    "contentMd": "# 快速开始\n\n这是第一版说明文档。",
    "status": "published",
    "version": "0.1.0",
    "createdBy": "admin",
    "createdAt": "2026-03-06T08:00:00.000Z",
    "updatedAt": "2026-03-06T08:10:00.000Z"
  }
}
```

---

### 3.7 获取公共共享配置全集

**GET** `/api/public/configs`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "hub.docs.home": {
      "id": "cfg_xxxxxxxx",
      "configKey": "hub.docs.home",
      "value": "https://intra.example.com/docs",
      "rawValue": "https://intra.example.com/docs",
      "valueType": "string",
      "scope": "public",
      "description": "文档首页地址",
      "createdAt": "2026-03-06T08:00:00.000Z",
      "updatedAt": "2026-03-06T08:00:00.000Z"
    },
    "hub.links": {
      "id": "cfg_xxxxxxxx",
      "configKey": "hub.links",
      "value": {
        "site": "https://intra.example.com",
        "download": "https://intra.example.com/download"
      },
      "rawValue": "{\"site\":\"https://intra.example.com\",\"download\":\"https://intra.example.com/download\"}",
      "valueType": "json",
      "scope": "public",
      "description": "Hub 常用链接",
      "createdAt": "2026-03-06T08:00:00.000Z",
      "updatedAt": "2026-03-06T08:00:00.000Z"
    }
  }
}
```

---

### 3.8 按 key 获取单个公共共享配置

**GET** `/api/public/configs/:key`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "cfg_xxxxxxxx",
    "configKey": "hub.docs.home",
    "value": "https://intra.example.com/docs",
    "rawValue": "https://intra.example.com/docs",
    "valueType": "string",
    "scope": "public",
    "description": "文档首页地址",
    "createdAt": "2026-03-06T08:00:00.000Z",
    "updatedAt": "2026-03-06T08:00:00.000Z"
  }
}
```

---

## 4. 管理接口

以下接口除 `login` 外，均需要管理员登录态。

---

## 4.1 反馈管理

### 4.1.1 获取反馈列表

**GET** `/api/admin/feedbacks`

#### Query 参数

- `status`: `open | processing | resolved | closed`
- `category`: `bug | suggestion | feature | other`
- `keyword`: 关键字
- `page`: 默认 `1`
- `pageSize`: 默认 `20`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "fb_xxxxxxxx",
        "source": "desktop",
        "category": "bug",
        "title": "任务执行窗口偶发卡死",
        "content": "点击停止后界面未刷新",
        "contact": "zjing",
        "clientName": "ng-manager desktop",
        "clientVersion": "0.1.0",
        "osInfo": "Windows 11",
        "status": "open",
        "createdAt": "2026-03-06T08:00:00.000Z",
        "updatedAt": "2026-03-06T08:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

---

### 4.1.2 获取反馈详情

**GET** `/api/admin/feedbacks/:id`

---

### 4.1.3 更新反馈状态

**PUT** `/api/admin/feedbacks/:id/status`

#### 请求体

```json
{
  "status": "processing"
}
```

#### 可选值

- `open`
- `processing`
- `resolved`
- `closed`

---

## 4.2 公告管理

### 4.2.1 获取公告列表

**GET** `/api/admin/announcements`

#### Query 参数

- `status`: `draft | published | archived`
- `scope`: `all | desktop | cli`
- `pinned`: `true | false`
- `keyword`: 关键字
- `page`
- `pageSize`

---

### 4.2.2 获取公告详情

**GET** `/api/admin/announcements/:id`

---

### 4.2.3 创建公告

**POST** `/api/admin/announcements`

#### 请求体

```json
{
  "title": "ng-manager 0.1.0 发布",
  "summary": "桌面端首个内测版本",
  "contentMd": "# 发布说明\n\n已支持任务执行与项目管理基础能力。",
  "scope": "desktop",
  "pinned": true,
  "publishAt": "2026-03-06T12:00:00.000Z",
  "expireAt": "2026-04-01T00:00:00.000Z",
  "createdBy": "admin"
}
```

#### 字段说明

- `scope`: `all | desktop | cli`
- `pinned`: 是否置顶
- 创建后默认 `status = draft`

---

### 4.2.4 更新公告

**PUT** `/api/admin/announcements/:id`

#### 请求体

```json
{
  "title": "ng-manager 0.1.0 发布（更新）",
  "summary": "更新后的发布说明",
  "contentMd": "# 发布说明\n\n更新内容。",
  "scope": "desktop",
  "pinned": true,
  "publishAt": "2026-03-06T12:00:00.000Z",
  "expireAt": null
}
```

---

### 4.2.5 发布公告

**POST** `/api/admin/announcements/:id/publish`

#### 请求体

```json
{
  "publishAt": "2026-03-06T12:00:00.000Z"
}
```

#### 说明

- 若未提供 `publishAt`，则默认使用当前时间或已有时间。
- 发布后 `status = published`。

---

### 4.2.6 归档公告

**POST** `/api/admin/announcements/:id/archive`

#### 响应

返回归档后的公告对象。

---

## 4.3 文档管理

### 4.3.1 获取文档列表

**GET** `/api/admin/documents`

#### Query 参数

- `status`: `draft | published | archived`
- `category`: `guide | faq | release-note | spec | policy | other`
- `keyword`
- `page`
- `pageSize`

---

### 4.3.2 获取文档详情

**GET** `/api/admin/documents/:id`

---

### 4.3.3 创建文档

**POST** `/api/admin/documents`

#### 请求体

```json
{
  "slug": "getting-started",
  "title": "快速开始",
  "category": "guide",
  "summary": "ngm-hub 的接入说明",
  "contentMd": "# 快速开始\n\n这是第一版说明文档。",
  "version": "0.1.0",
  "createdBy": "admin"
}
```

#### 说明

- `slug` 必须为 kebab-case。
- 创建后默认 `status = draft`。
- `slug` 全局唯一。

---

### 4.3.4 更新文档

**PUT** `/api/admin/documents/:id`

#### 请求体

```json
{
  "title": "快速开始 v2",
  "summary": "更新后的使用说明",
  "contentMd": "# 快速开始\n\n更新内容。",
  "version": "0.1.1"
}
```

---

### 4.3.5 发布文档

**POST** `/api/admin/documents/:id/publish`

#### 请求体

```json
{}
```

#### 说明

发布后 `status = published`。

---

### 4.3.6 归档文档

**POST** `/api/admin/documents/:id/archive`

---

### 4.3.7 删除文档

**DELETE** `/api/admin/documents/:id`

#### 响应示例

```json
{
  "code": "OK",
  "message": "document deleted",
  "data": {
    "id": "doc_xxxxxxxx"
  }
}
```

---

## 4.4 共享配置管理

### 4.4.1 获取配置列表

**GET** `/api/admin/configs`

#### Query 参数

- `scope`: `public | admin`
- `keyword`
- `page`
- `pageSize`

#### 响应示例

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "cfg_xxxxxxxx",
        "configKey": "hub.docs.home",
        "value": "https://intra.example.com/docs",
        "rawValue": "https://intra.example.com/docs",
        "valueType": "string",
        "scope": "public",
        "description": "文档首页地址",
        "createdAt": "2026-03-06T08:00:00.000Z",
        "updatedAt": "2026-03-06T08:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

---

### 4.4.2 获取配置详情

**GET** `/api/admin/configs/:id`

---

### 4.4.3 创建配置

**POST** `/api/admin/configs`

#### 请求体

```json
{
  "configKey": "hub.docs.home",
  "configValue": "https://intra.example.com/docs",
  "valueType": "string",
  "scope": "public",
  "description": "文档首页地址"
}
```

#### 字段说明

- `configKey`：小写，支持点/下划线/中划线分隔
- `valueType`: `string | json | number | boolean`
- `scope`: `public | admin`

#### 类型规则

- `string`：直接使用原字符串
- `json`：必须是合法 JSON 字符串
- `number`：必须可转为有限数字
- `boolean`：仅允许 `true` 或 `false`

---

### 4.4.4 更新配置

**PUT** `/api/admin/configs/:id`

#### 请求体

```json
{
  "configValue": "https://intra.example.com/help",
  "description": "帮助中心地址"
}
```

---

### 4.4.5 删除配置

**DELETE** `/api/admin/configs/:id`

#### 响应示例

```json
{
  "code": "OK",
  "message": "shared config deleted",
  "data": {
    "id": "cfg_xxxxxxxx"
  }
}
```

---

## 5. 枚举与数据字典

### 5.1 Feedback

#### source

- `desktop`
- `cli`
- `web`

#### category

- `bug`
- `suggestion`
- `feature`
- `other`

#### status

- `open`
- `processing`
- `resolved`
- `closed`

---

### 5.2 Announcement

#### scope

- `all`
- `desktop`
- `cli`

#### status

- `draft`
- `published`
- `archived`

---

### 5.3 Document

#### category

- `guide`
- `faq`
- `release-note`
- `spec`
- `policy`
- `other`

#### status

- `draft`
- `published`
- `archived`

---

### 5.4 Shared Config

#### valueType

- `string`
- `json`
- `number`
- `boolean`

#### scope

- `public`
- `admin`

---

### 5.5 Admin User

#### status

- `active`
- `disabled`

---

## 6. 推荐的首批共享配置键

建议优先维护以下 key：

- `hub.site.home`
- `hub.docs.home`
- `hub.download.home`
- `hub.announcement.defaultLimit`
- `hub.documents.defaultCategory`
- `desktop.feedback.enabled`
- `cli.feedback.enabled`
- `hub.links`

`hub.links` 可用 JSON：

```json
{
  "site": "http://192.168.1.100:8080",
  "docs": "http://192.168.1.100:8080/docs",
  "download": "http://192.168.1.100:8080/download"
}
```

---

## 7. 当前版本说明

本文档对应的接口范围为当前 `ngm-hub-server` MVP 阶段，已覆盖：

- `auth`
- `feedback`
- `announcement`
- `document`
- `shared-config`

后续若继续增加：

- 下载中心
- 反馈回复
- 审计日志
- 配置历史版本
- 公告删除
- 公共配置简化视图

建议将文档版本升级为 `v0.2+` 并补充变更记录。

