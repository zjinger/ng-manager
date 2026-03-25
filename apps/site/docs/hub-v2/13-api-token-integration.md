# 13 Hub V2 API Token 接入说明

## 1. 背景与目标

`ng-manager/webapp` 是开发者日常使用的工作台，很多场景只需要查看 Hub V2 的项目数据（Issue、研发项、反馈），并不希望反复登录 Hub 管理端。

因此在 Hub V2 增加一套**项目级 API Token**机制：

- 由项目侧签发 token
- 由调用方仅携带 token 即可访问只读接口
- 与管理端登录态（JWT + Cookie）隔离

目标是实现“**开发者在 webapp 内可直接读取 Hub V2 项目数据**”。

---

## 2. 设计原则

### 2.1 为什么不用 `user + projectKey` 直接拼 Key

直接拼接的 key 无法安全撤销、轮换和审计，泄露后风险不可控。  
因此采用“随机高熵 token + 服务端哈希存储 + 可撤销”的方案。

### 2.2 权限最小化

第一阶段仅开放只读 scope：

- `issues:read`
- `rd:read`
- `feedbacks:read`

默认不开放写接口，降低误操作与泄露风险。

### 2.3 项目强绑定

token 在服务端绑定单一项目（内部是 `projectId`，外部接口使用 `projectKey`），即使调用方传入其它项目参数，也会被拒绝。

---

## 3. 鉴权模型

## 3.1 双鉴权通道

- 管理端接口：`/api/admin/*`，继续使用用户登录态（JWT）
- Token 接口：`/api/token/*`，只接受 `Authorization: Bearer <token>`

两者隔离，防止 token 访问管理端写接口。

## 3.2 RequestContext 扩展

`RequestContext` 新增：

- `authType`: `anonymous | user | token | public`
- `authScopes?: string[]`
- `tokenId?: string`

在 `/api/token/*` 请求中，服务端会把 token 校验结果注入 `requestContext`。

## 3.3 requireAuth 与 requireTokenAuth

- `requireAuth`：仅允许 `authType = user`
- `requireTokenAuth(scope)`：仅允许 `authType = token`，且校验 scope

---

## 4. 数据库模型

新增表：`project_api_tokens`

关键字段：

- `project_id`: 绑定项目
- `owner_user_id`: 签发人
- `token_prefix`: 前缀索引（快速定位）
- `token_hash`: token 的 SHA-256 哈希值（不存明文）
- `scopes_json`: scope 列表
- `status`: `active | revoked`
- `expires_at`, `last_used_at`

迁移文件：

- `apps/hub-v2/server/src/db/migrations/0016_api_tokens.sql`

---

## 5. 服务端接口

## 5.1 管理端（签发与吊销）

前缀：`/api/admin`

- `GET /projects/:projectKey/api-tokens`：查询 token 列表
- `POST /projects/:projectKey/api-tokens`：创建 token（明文仅返回一次）
- `DELETE /projects/:projectKey/api-tokens/:tokenId`：吊销 token

权限：`admin` 或项目 `owner/project_admin`。

## 5.2 Token 只读接口

前缀：`/api/token`

- `GET /projects/:projectKey/issues`
- `GET /projects/:projectKey/issues/:issueId`
- `GET /projects/:projectKey/issues/:issueId/logs`
- `GET /projects/:projectKey/rd-items`
- `GET /projects/:projectKey/rd-items/:itemId`
- `GET /projects/:projectKey/rd-items/:itemId/logs`
- `GET /projects/:projectKey/feedbacks`
- `GET /projects/:projectKey/feedbacks/:feedbackId`

---

## 6. 调用示例

```bash
curl -H "Authorization: Bearer ngm_ptk_xxx" \
  "http://<hub-v2-host>/api/token/projects/<projectKey>/issues?page=1&pageSize=20"
```

---

## 7. webapp 侧接入

`packages/api` 新增 `ProjectTokenApiClient`，统一封装 token 调用：

- 构造参数：`baseUrl + apiToken`
- 内置请求头：`Authorization: Bearer <apiToken>`
- 提供通用方法：`request()` / `getByPath()`

适用于在 `ng-manager/webapp` 中直接读取 Hub V2 项目数据，无需 Hub UI 登录。

---

## 8. 安全与运维建议

- token 明文只展示一次，调用方自行妥善保存
- 默认设置过期时间，避免长期有效凭证
- 定期轮换 token，旧 token 及时吊销
- 通过 `last_used_at` 做活跃度审计
- 线上建议配合内网策略和 HTTPS

---

## 9. 当前边界与后续规划

当前版本只支持只读数据接入，不支持 token 写操作。  
后续可按业务需要增加细粒度 scope（如评论只写、附件只读）与 IP 白名单策略。
