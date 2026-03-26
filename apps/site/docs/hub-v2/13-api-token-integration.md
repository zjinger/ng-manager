# 13 Hub V2 Token 体系与 webapp 读写接入方案

最后更新：2026-03-26

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

- webapp 只传 `projectId` 与业务路径
- packages/server 读取项目配置并补齐 `projectKey` 与鉴权信息
- hub-v2 负责 scope 校验、业务权限校验、状态机校验、审计落库

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

约束：

- `projectKey` 按配置原值使用，仅做空白处理
- 前端不拼接 `projectKey`，由 server 侧补齐

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

---

## 5.2 读取接口

Issue：

- `GET /api/token/projects/:projectKey/issues`
- `GET /api/token/projects/:projectKey/issues/:issueId`
- `GET /projects/:projectKey/issues/:issueId/logs`

RD：

- `GET /api/token/projects/:projectKey/rd-items`
- `GET /api/token/projects/:projectKey/rd-items/:itemId`
- `GET /projects/:projectKey/rd-items/:itemId/logs`

Feedback：
- `GET /projects/:projectKey/feedbacks`
- `GET /projects/:projectKey/feedbacks/:feedbackId`

---

## 5.3 写入接口

Issue：

- `POST /api/personal/projects/:projectKey/issues/:issueId/comments`
- `POST /api/personal/projects/:projectKey/issues/:issueId/transitions`
- `POST /api/personal/projects/:projectKey/issues/:issueId/assignee`
- `POST /api/personal/projects/:projectKey/issues/:issueId/participants`
- `DELETE /api/personal/projects/:projectKey/issues/:issueId/participants/:userId`

RD：

- `POST /api/personal/projects/:projectKey/rd-items/:itemId/start`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/block`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/resume`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/complete`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/progress`
- `PATCH /api/personal/projects/:projectKey/rd-items/:itemId`
- `DELETE /api/personal/projects/:projectKey/rd-items/:itemId`

---

## 6. 权限方案

### 6.1 Scope 映射

| 模块 | 操作 | Scope |
|---|---|---|
| Issue | 列表与详情 | `issue:read` |
| Issue | 评论 | `issue:comment:write` |
| Issue | 状态流转 | `issue:transition:write` |
| Issue | 指派与认领 | `issue:assign:write` |
| Issue | 协作人管理 | `issue:participant:write` |
| RD | 列表与详情 | `rd:read` |
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
- webapp 不承担 `projectKey` 拼接与 token 鉴权细节

