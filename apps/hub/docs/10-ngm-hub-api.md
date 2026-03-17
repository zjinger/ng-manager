# ngm-hub API 文档（MVP）

## 1. 基本说明

### 1.1 服务定位

`ngm-hub` 是一个部署在内网的轻量 Hub 服务，用于提供以下增强能力：

-   公告发布
-   文档下发
-   项目归属管理
-   共享配置分发
-   客户端反馈收集
-   管理端登录与内容维护

Hub 不参与客户端本地任务执行，仅负责内容分发与集中管理。

------------------------------------------------------------------------

## 1.2 Base URL

    http://<hub-host>:<port>/api

示例：

    http://192.168.1.31:7070/api

------------------------------------------------------------------------

## 1.3 鉴权方式

管理端接口：

    Cookie: ngm_hub_token=<jwt>

兼容旧调用方式的文档说明：

    Authorization: Bearer <token>

部分客户端读取接口允许匿名访问，例如：

-   获取公告列表
-   获取文档列表
-   获取共享配置

------------------------------------------------------------------------

## 1.4 统一响应结构

成功：

``` json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败：

``` json
{
  "code": "AUTH_UNAUTHORIZED",
  "message": "unauthorized"
}
```

------------------------------------------------------------------------

# 2. Auth 模块

Auth 路由统一前缀：

    /api/admin

## GET /auth/login/challenge

获取一次性登录 challenge，供加密登录使用。

## POST /auth/login

管理员登录。

支持两种请求体：

1. 加密登录（Web 登录页使用）
2. 明文登录（服务端兼容）

加密登录请求示例：

``` json
{
  "username": "admin",
  "nonce": "challenge-nonce",
  "iv": "base64-iv",
  "cipherText": "base64-cipher"
}
```

明文登录请求示例：

``` json
{
  "username": "admin",
  "password": "123456"
}
```

响应示例：

``` json
{
  "code": "OK",
  "message": "login success",
  "data": {
    "id": "adm_xxx",
    "username": "admin",
    "nickname": "Administrator",
    "status": "active",
    "role": "admin",
    "mustChangePassword": false,
    "createdAt": "2026-03-17T08:00:00.000Z",
    "updatedAt": "2026-03-17T08:00:00.000Z"
  }
}
```

说明：登录成功后服务端会通过 `Set-Cookie` 写入 `ngm_hub_token`。

## POST /auth/login/plain

用于 API 工具快速登录的明文密码接口。

请求：

``` json
{
  "username": "admin",
  "password": "123456"
}
```

响应：

``` json
{
  "code": "OK",
  "message": "plain login success",
  "data": {
    "id": "adm_xxx",
    "username": "admin",
    "nickname": "Administrator",
    "status": "active",
    "role": "admin",
    "mustChangePassword": false,
    "createdAt": "2026-03-17T08:00:00.000Z",
    "updatedAt": "2026-03-17T08:00:00.000Z"
  }
}
```

说明：登录成功后服务端会通过 `Set-Cookie` 写入 `ngm_hub_token`，后续调用 `/api/admin/*` 接口时直接带 cookie 即可。

## GET /auth/me

获取当前登录用户。

## POST /auth/logout

退出登录。

------------------------------------------------------------------------

# 3. Project 模块

项目用于区分公告、文档和配置归属。

## GET /admin/projects

获取项目列表

参数：

  参数       类型     说明
  ---------- -------- ------------
  page       number   页码
  pageSize   number   每页数量
  keyword    string   项目名搜索

响应示例

``` json
{
  "code": "OK",
  "message": "success",
  "data": {
    "list": [
      {
        "id": "prj_001",
        "name": "ng-manager",
        "key": "ng-manager",
        "status": "active"
      }
    ]
  }
}
```

------------------------------------------------------------------------

## POST /admin/projects

创建项目

``` json
{
  "name": "ng-manager",
  "key": "ng-manager",
  "description": "本地工程管理平台"
}
```

------------------------------------------------------------------------

# 4. Announcement 公告模块

## GET /announcements

客户端获取公告列表

参数

  参数         说明
  ------------ ----------
  projectKey   项目 key
  page         页码
  pageSize     每页数量

响应

``` json
{
  "code": "OK",
  "message": "success",
  "data": {
    "list": [
      {
        "id": "ann_001",
        "title": "系统升级通知",
        "summary": "周五维护",
        "publishedAt": "2026-03-09T10:00:00Z"
      }
    ]
  }
}
```

------------------------------------------------------------------------

## GET /announcements/:id

获取公告详情

------------------------------------------------------------------------

## POST /admin/announcements

创建公告

------------------------------------------------------------------------

## POST /admin/announcements/:id/publish

发布公告

------------------------------------------------------------------------

# 5. Document 文档模块

## GET /documents

客户端获取文档列表

参数

  参数         说明
  ------------ ----------
  projectKey   项目 key
  category     文档分类
  page         页码
  pageSize     每页数量

------------------------------------------------------------------------

## GET /documents/:id

获取文档详情

------------------------------------------------------------------------

## POST /admin/documents

创建文档

------------------------------------------------------------------------

## POST /admin/documents/:id/publish

发布文档

------------------------------------------------------------------------

# 6. Feedback 反馈模块

客户端提交反馈。

## POST /feedback

请求

``` json
{
  "projectKey": "ng-manager",
  "type": "bug",
  "title": "任务执行失败",
  "content": "npm run dev 报错"
}
```

响应

``` json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "fb_001"
  }
}
```

------------------------------------------------------------------------

## GET /admin/feedbacks

管理端查看反馈列表

------------------------------------------------------------------------

# 7. Shared Config 模块

用于给客户端分发公共配置。

## GET /shared-configs

客户端获取配置

------------------------------------------------------------------------

## POST /admin/shared-configs

创建配置

------------------------------------------------------------------------

# 8. 推荐错误码

  code             说明
  ---------------- --------------
  BAD_REQUEST      参数错误
  UNAUTHORIZED     未登录
  FORBIDDEN        无权限
  NOT_FOUND        资源不存在
  CONFLICT         数据冲突
  INTERNAL_ERROR   服务内部错误

------------------------------------------------------------------------

# 9. 推荐状态枚举

## Project.status

    active | inactive

## Announcement.status

    draft | published | archived

## Document.status

    draft | published | archived

## Feedback.type

    bug | suggestion | question

## Feedback.status

    open | processing | closed

------------------------------------------------------------------------

# 10. 路由结构建议

管理端：

    /api/admin/projects
    /api/admin/announcements
    /api/admin/documents
    /api/admin/feedbacks
    /api/admin/shared-configs
    /api/admin/auth/login
    /api/admin/auth/login/plain
    /api/admin/auth/me

客户端：

    /api/public/projects
    /api/public/announcements
    /api/public/documents
    /api/public/feedback
    /api/public/shared-configs

------------------------------------------------------------------------

# ngm-hub API 文档结束
