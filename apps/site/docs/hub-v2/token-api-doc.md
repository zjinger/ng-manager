最后更新：2026-06-01

## 1. 使用前提

使用者需要同时满足以下条件：

- 已有协作平台登录账号，账号状态为正常启用。
- 是目标项目成员。
- 已知道目标项目的 `projectKey`。
- 已创建 Personal Token，并勾选文档相关权限。

Personal Token 是个人身份凭证。不要把完整 Token 写入共享文档、群聊、代码仓库或截图中；如发生泄露，应立即在个人中心撤销。

## 2. 创建 Personal Token

进入 协作平台 后，打开个人中心的 API Token 区域。

> 截图地址：`/api/admin/uploads/upl_4i0bo4dp2nb7/raw`

点击“新建 Token”，填写名称，建议名称能说明用途，例如：

- `docs-cli-local`
- `docs-auto-publish`
- `project-doc-sync`

勾选以下权限：

| 操作 | 必选 Scope | 说明 |
|---|---|---|
| 创建文档 | `doc:create:write` | 允许创建项目文档草稿 |
| 编辑文档 | `doc:update:write` | 允许编辑文档标题、正文、slug、分类、摘要等 |
| 发布文档 | `doc:publish:write` | 允许发布文档 |

> 截图地址：`/api/admin/uploads/upl_dij1p1u0t0sq/raw`

创建成功后，系统只展示一次完整 Token。请立即保存到本机安全位置。

> 截图地址：`/api/admin/uploads/upl_lqw15qv9pdoz/raw`

## 3. 获取 projectKey

接口路径使用项目的 `projectKey`，不是本地项目 ID，也不是项目名称。

推荐从以下位置获取：

- 项目配置页面中点击复制图标。
- 由项目管理员提供。

示例：

```text
projectKey = prj_xxxxxxxxxxxxxxxxxxxxxxxx
```

> 截图地址：`/api/admin/uploads/upl_dlcxl0qdghku/raw`

## 4. 创建文档

接口：

```text
POST /api/personal/projects/:projectKey/docs
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X POST "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"title\":\"Token API 测试文档\",\"slug\":\"token-api-test-doc\",\"content\":\"# Token API 测试文档\n\n这是一篇通过 Personal Token 创建的文档。\",\"categoryId\":\"api-test\",\"summary\":\"Personal Token 创建文档测试\",\"tags\":[\"token-api\",\"docs\"],\"status\":\"draft\",\"source\":\"curl\"}"
```

字段说明：

| 字段 | 是否必填 | 说明 |
|---|---:|---|
| `title` | 是 | 文档标题 |
| `content` | 是 | Markdown 正文，也可以使用 `contentMd` |
| `slug` | 否 | 文档标识，建议使用英文短词并用中划线连接，例如 `token-api-test-doc` |
| `categoryId` | 否 | 分类标识，当前会作为文档分类字段写入 |
| `summary` | 否 | 摘要 |
| `tags` | 否 | 标签，仅用于 Token 调用审计 |
| `status` | 否 | 创建接口只允许缺省或 `draft` |
| `source` | 否 | 调用来源，仅用于 Token 调用审计 |

创建成功后会返回文档 ID。后续编辑和发布都需要使用该 `id`。

成功响应示例：

```json
{
  "code": "OK",
  "message": "document created",
  "data": {
    "id": "doc_xxx",
    "title": "Token API 测试文档",
    "slug": "token-api-test-doc",
    "category": "api-test",
    "categoryId": "api-test",
    "status": "draft",
    "publishAt": null,
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z"
  }
}
```

> 截图地址：`/api/admin/uploads/upl_ajl18937d8hg/raw`

## 5. 编辑文档

接口：

```text
PATCH /api/personal/projects/:projectKey/docs/:docId
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X PATCH "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"title\":\"Token API 更新后的文档\",\"slug\":\"token-api-updated-doc\",\"content\":\"# Token API 更新后的文档\n\n这是通过 Personal Token 更新后的正文。\",\"categoryId\":\"api-test\",\"summary\":\"Personal Token 编辑文档测试\",\"tags\":[\"token-api\",\"docs\",\"updated\"],\"source\":\"curl\"}"
```

编辑接口允许修改：

- `title`
- `content` 或 `contentMd`
- `slug`
- `category` 或 `categoryId`
- `summary`
- `version`

编辑接口不允许通过 `status` 发布或归档文档。需要发布时，必须调用发布接口。

> 截图地址：`/api/admin/uploads/upl_gdp7up8d3ffn/raw`

## 6. 发布文档

接口：

```text
POST /api/personal/projects/:projectKey/docs/:docId/publish
```

Windows cmd 可直接复制的 curl 模板：

```cmd
curl -X POST "http://192.168.1.31:7008/api/personal/projects/<PROJECT_KEY>/docs/<DOC_ID>/publish" -H "Content-Type: application/json" -H "Authorization: Bearer <PERSONAL_TOKEN>" -d "{\"source\":\"curl\"}"
```

发布成功后，返回的 `status` 为 `published`，并返回 `publishAt`。

> 截图地址：`/api/admin/uploads/upl_71qnb3y2kocf/raw`

## 7. 在页面中确认结果

发布后进入协作平台内容中心或项目文档入口，按标题或 slug 查找文档，确认以下内容：

- 文档标题正确。
- 文档正文渲染正确。
- 文档状态为已发布。
- 文档 slug 为英文短词中划线格式。

## 8. 常见问题

### 8.1 返回 `TOKEN_SCOPE_FORBIDDEN`

原因：Personal Token 缺少对应权限。

处理方式：

- 创建文档需要 `doc:create:write`。
- 编辑文档需要 `doc:update:write`。
- 发布文档需要 `doc:publish:write`。
- 重新创建 Token 或使用权限完整的 Token。

### 8.2 返回 `PROJECT_NOT_FOUND`

原因：`projectKey` 不存在或填写错误。

处理方式：

- 确认路径里使用的是协作平台的 `projectKey`。
- 不要使用本地项目 ID、项目名称或 display code。

### 8.3 返回 `PROJECT_ACCESS_DENIED`

原因：Token 所属用户不是目标项目成员，或没有文档操作所需的项目访问权限。

处理方式：

- 联系项目管理员把该用户加入目标项目。
- 确认当前 Token 是由正确用户创建。

### 8.4 返回 `DOCUMENT_SLUG_EXISTS`

原因：同一项目下已有相同 slug 的文档。

处理方式：

- 换一个 slug，例如 `token-api-test-doc-2`。
- 或编辑已有文档，而不是重新创建。

### 8.5 返回 `DOCUMENT_NOT_FOUND`

原因：`docId` 不存在，或该文档不属于 URL 中的 `projectKey`。

处理方式：

- 使用创建接口返回的 `data.id`。
- 确认 `docId` 与 `projectKey` 属于同一个项目。

## 9. 使用规则

- Personal Token 调用会更新 Token 最近使用时间。
- 创建、编辑、发布文档会写入 Token 调用审计。
- 审计只记录标题、分类、摘要、标签、状态、来源、slug 等非敏感字段。
- 审计不会记录完整 Token，也不会记录完整正文内容。
- 已撤销 Token 不能继续调用接口。
- 已撤销 Token 可在个人中心删除记录，避免列表长期堆积。

## 10. 推荐操作流程

1. 在个人中心创建 Personal Token，勾选 `doc:create:write`、`doc:update:write`、`doc:publish:write`。
2. 获取目标项目 `projectKey`。
3. 调用创建接口，显式传入英文中划线 `slug`。
4. 保存创建接口返回的 `data.id`。
5. 如需调整内容，调用编辑接口。
6. 内容确认无误后，调用发布接口。
7. 在 协作平台 页面中确认文档列表和详情页显示正常。
8. 测试完成后，如 Token 不再使用，在个人中心撤销；已撤销记录可删除。
