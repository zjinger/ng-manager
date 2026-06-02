# Project Token 读取文档操作说明

最后更新：2026-06-02

本文面向内部成员，说明如何通过 Project Token 调用协作平台接口读取项目文档。文档写入、编辑、发布请使用 Personal Token；文档读取建议使用 Project Token。

## 1. 使用前提

使用者需要同时满足以下条件：

- 已知道目标项目的 `projectKey`。
- 已获取目标项目的 Project Token。
- Project Token 已勾选 `docs:read` 权限。
- 已知道协作平台服务地址，目前是 `http://192.168.1.31:7008`。

Project Token 是项目级访问凭证。不要把完整 Token 写入共享文档、群聊、代码仓库或截图中；如发生泄露，应立即撤销并重新生成。

## 2. 创建或获取 Project Token

进入协作平台后，在项目相关的 API Token 配置区域创建 Project Token，或向项目管理员获取已经创建好的 Project Token。

> 截图位置：项目 Token 创建入口

勾选以下权限：

| 操作 | 必选 Scope | 说明 |
|---|---|---|
| 读取文档 | `docs:read` | 允许读取当前项目下的文档列表和详情 |

Project Token 只能访问它绑定项目下的数据，不能跨项目读取文档。

> 截图位置：Project Token scope 勾选 `docs:read`

## 3. 获取 projectKey

接口路径使用项目的 `projectKey`，不是本地项目 ID，也不是项目名称。

推荐从以下位置获取：

- 项目配置页面中点击复制图标。
- 由项目管理员提供。

示例：

```text
projectKey = prj_xxxxxxxxxxxxxxxxxxxxxxxx
```

> 截图位置：项目配置中的 projectKey

## 4. 读取文档列表

接口：

```text
GET /api/token/projects/:projectKey/docs
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs?page=1&pageSize=20&statusGroup=active" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

查询参数：

| 参数 | 是否必填 | 说明 |
|---|---:|---|
| `page` | 否 | 页码，默认第 1 页 |
| `pageSize` | 否 | 每页条数 |
| `keyword` | 否 | 搜索标题、摘要、正文或 slug |
| `category` | 否 | 文档分类 |
| `categoryId` | 否 | `category` 的兼容别名 |
| `status` | 否 | 可选 `draft`、`published`、`archived` |
| `statusGroup` | 否 | 推荐使用 `active`，表示草稿和已发布，不返回已归档 |

默认读取口径：

- 不传 `status` 时，默认按 `statusGroup=active` 读取草稿和已发布文档。
- 如需读取已归档文档，需要显式传 `status=archived`。
- 列表接口不返回完整 `contentMd`，避免列表响应数据量过大。

成功响应示例：

```json
{
  "code": "OK",
  "message": "OK",
  "data": {
    "items": [
      {
        "id": "doc_xxx",
        "projectId": "prj_xxx",
        "slug": "token-api-read-doc",
        "title": "Token API 读取测试文档",
        "category": "api-test",
        "categoryId": "api-test",
        "summary": "Project Token 读取文档测试",
        "status": "published",
        "version": null,
        "createdBy": "usr_xxx",
        "createdByName": "张三",
        "publishAt": "2026-06-02T09:00:00.000Z",
        "createdAt": "2026-06-02T08:00:00.000Z",
        "updatedAt": "2026-06-02T09:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

> 截图位置：curl 读取文档列表结果

## 5. 按文档 ID 读取详情

接口：

```text
GET /api/token/projects/:projectKey/docs/:docId
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

详情接口会返回完整 Markdown 正文 `contentMd`，适合在外部工具、脚本或 AI Agent 中读取并处理文档内容。

成功响应示例：

```json
{
  "code": "OK",
  "message": "OK",
  "data": {
    "id": "doc_xxx",
    "projectId": "prj_xxx",
    "slug": "token-api-read-doc",
    "title": "Token API 读取测试文档",
    "category": "api-test",
    "categoryId": "api-test",
    "summary": "Project Token 读取文档测试",
    "contentMd": "# Token API 读取测试文档\n\n这里是 Markdown 正文。",
    "status": "published",
    "version": null,
    "createdBy": "usr_xxx",
    "createdByName": "张三",
    "publishAt": "2026-06-02T09:00:00.000Z",
    "createdAt": "2026-06-02T08:00:00.000Z",
    "updatedAt": "2026-06-02T09:00:00.000Z"
  }
}
```

> 截图位置：curl 按 docId 读取详情结果

## 6. 按 Slug 读取详情

接口：

```text
GET /api/token/projects/:projectKey/docs/by-slug/:slug
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs/by-slug/<DOC_SLUG>" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

适用场景：

- 外部系统只保存文档标识 `slug`。
- 文档由脚本或 Personal Token 创建时已经显式指定英文中划线 slug。
- 希望通过稳定标识读取文档，而不是依赖文档 ID。

Slug 建议使用英文短词并用中划线连接，例如：

```text
token-api-read-doc
project-api-guide
release-note-sync-rule
```

> 截图位置：curl 按 slug 读取详情结果

## 7. 读取已归档文档

默认列表不返回已归档文档。如需读取已归档文档列表，需要显式指定状态：

```cmd
curl -X GET "http://192.168.1.31:7008/api/token/projects/<PROJECT_KEY>/docs?page=1&pageSize=20&status=archived" -H "Authorization: Bearer <PROJECT_TOKEN>"
```

如已知道已归档文档的 `docId` 或 `slug`，也可以直接调用详情接口读取。

## 8. 常见问题

### 8.1 返回 `TOKEN_SCOPE_FORBIDDEN`

原因：Project Token 缺少 `docs:read` 权限。

处理方式：

- 检查 Project Token 是否勾选 `docs:read`。
- 重新创建 Token 或让项目管理员调整 Token 权限。

### 8.2 返回 `PROJECT_NOT_FOUND`

原因：`projectKey` 不存在或填写错误。

处理方式：

- 确认路径里使用的是协作平台的 `projectKey`。
- 不要使用本地项目 ID、项目名称或 display code。

### 8.3 返回 `TOKEN_PROJECT_FORBIDDEN`

原因：Project Token 绑定的项目与 URL 中的 `projectKey` 不一致。

处理方式：

- 使用目标项目自己的 Project Token。
- 确认 `projectKey` 与 Token 来源项目一致。

### 8.4 返回 `DOCUMENT_NOT_FOUND`

原因：文档不存在，或文档不属于 URL 中的 `projectKey`。

处理方式：

- 从列表接口重新确认 `data.items[].id` 或 `data.items[].slug`。
- 确认 `docId`、`slug` 与 `projectKey` 属于同一个项目。

### 8.5 列表中没有 `contentMd`

这是预期行为。列表接口只返回元信息，不返回完整 Markdown 正文，避免响应体过大。需要正文时调用详情接口：

- `GET /api/token/projects/:projectKey/docs/:docId`
- `GET /api/token/projects/:projectKey/docs/by-slug/:slug`

## 9. 使用规则

- Project Token 读取接口只读，不支持创建、编辑、发布文档。
- Project Token 读取文档需要 `docs:read`。
- Project Token 只能读取绑定项目下的文档。
- 列表接口不返回 `contentMd`。
- 详情接口返回完整 `contentMd`。
- Token 调用会更新最近使用时间。
- 已撤销或过期 Token 不能继续调用接口。

## 10. 推荐操作流程

1. 获取目标项目 `projectKey`。
2. 获取带 `docs:read` 的 Project Token。
3. 调用列表接口，找到目标文档的 `id` 或 `slug`。
4. 需要正文时，调用详情接口读取 `contentMd`。
5. 如需读取归档文档，列表接口显式传 `status=archived`。
6. 如需写入、编辑或发布文档，改用 Personal Token 文档写入流程。
