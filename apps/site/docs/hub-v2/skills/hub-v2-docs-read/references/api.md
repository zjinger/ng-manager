# Hub V2 Project Token Docs Read API

## Authentication

Use Project Token:

```http
Authorization: Bearer <PROJECT_TOKEN>
```

Required scope:

```text
docs:read
```

Do not expose the full token in logs, responses, screenshots, or generated files.

## Endpoints

### List Documents

```http
GET /api/token/projects/:projectKey/docs
```

Query parameters:

| Name | Description |
|---|---|
| `page` | Page number. Defaults to page 1. |
| `pageSize` | Page size. |
| `keyword` | Search title, summary, slug, or markdown body. |
| `category` | Document category. |
| `categoryId` | Alias of `category`. |
| `status` | Optional `draft`, `published`, or `archived`. |
| `statusGroup` | `active` means draft and published, excluding archived. |

Default list behavior:

- Use `statusGroup=active` when no status is requested.
- Archived docs require `status=archived`.
- List responses omit `contentMd`.

### Get Document By Id

```http
GET /api/token/projects/:projectKey/docs/:docId
```

Use when a list response already provided `data.items[].id`.

### Get Document By Slug

```http
GET /api/token/projects/:projectKey/docs/by-slug/:slug
```

Use when an external tool stores the stable document slug. Slugs should be English short words joined with hyphens, for example `project-api-guide`.

## Response Shape

All successful responses use the common wrapper:

```json
{
  "code": "OK",
  "message": "OK",
  "data": {}
}
```

List `data`:

```json
{
  "items": [
    {
      "id": "doc_xxx",
      "projectId": "prj_xxx",
      "slug": "project-api-guide",
      "title": "Project API Guide",
      "category": "api",
      "categoryId": "api",
      "summary": "Short summary",
      "status": "published",
      "version": null,
      "createdBy": "usr_xxx",
      "createdByName": "User Name",
      "publishAt": "2026-06-02T09:00:00.000Z",
      "createdAt": "2026-06-02T08:00:00.000Z",
      "updatedAt": "2026-06-02T09:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

Detail `data` includes all list metadata plus:

```json
{
  "contentMd": "# Markdown body"
}
```

## Error Codes

| Code | Meaning | Next step |
|---|---|---|
| `TOKEN_SCOPE_FORBIDDEN` | Token does not have `docs:read`. | Ask for a Project Token with `docs:read`. |
| `PROJECT_NOT_FOUND` | `projectKey` does not exist. | Verify the Hub V2 project key. |
| `TOKEN_PROJECT_FORBIDDEN` | Token belongs to a different project. | Use the Project Token for the requested project. |
| `DOCUMENT_NOT_FOUND` | Doc id or slug not found in the project. | Re-list docs and verify `id` or `slug`. |
| `TOKEN_RATE_LIMITED` | Token exceeded rate limit. | Back off and retry later. |

## Security Notes

- Do not store tokens in code.
- Prefer environment variables, secret managers, or the user's configured agent secret store.
- Redact token values when showing commands. Use `<PROJECT_TOKEN>` or only a short prefix.
- Project Token reads are project-scoped and read-only.
