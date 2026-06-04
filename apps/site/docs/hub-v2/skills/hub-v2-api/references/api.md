# SL Hub V2 Issue/RD Token API

## Scopes

Project Token read scopes:

- `issues:read`: Issue list/detail/logs/comments/participants/attachments/branches/project members and Issue/RD associations.
- `rd:read`: RD stages, RD list/detail/logs/stage history/progress/progress history.

Personal Token write scopes:

- `issue:comment:write`: create Issue comments.
- `issue:transition:write`: `start`, `wait-update`, `resolve`, `verify`, `reopen`, `close`.
- `issue:assign:write`: `assign`, `claim`.
- `issue:branch:write`: create/start/complete Issue branches.
- `issue:participant:write`: add/remove participants.
- `rd:transition:write`: `start`, `block`, `resume`, `complete`, `accept`, `reopen`, `close`, `advance-stage`, `progress`.
- `rd:edit:write`: update RD basic fields.

## Personal Token Introspection

- `GET /api/personal/me`
- `GET /api/personal/projects/:projectKey/capabilities`

Capabilities returns current token identity, project membership, active project status, and write capability booleans. The RD capability shape has only `canTransition` and `canEdit`.

## Issue Read Endpoints

All require Project Token with `issues:read`.

- `GET /api/token/projects/:projectKey/issues`
- `GET /api/token/projects/:projectKey/issues/:issueId`
- `GET /api/token/projects/:projectKey/issues/:issueId/logs`
- `GET /api/token/projects/:projectKey/issues/:issueId/comments`
- `GET /api/token/projects/:projectKey/issues/:issueId/participants`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments`
- `GET /api/token/projects/:projectKey/issues/:issueId/branches`
- `GET /api/token/projects/:projectKey/issues/:issueId/attachments/:attachmentId/raw`
- `GET /api/token/projects/:projectKey/issues/:issueId/uploads/:uploadId/raw`
- `GET /api/token/projects/:projectKey/members`

Issue list query supports `page`, `pageSize`, `keyword`, `rdItemId`, `status`, `types`, `type`, `priority`, `reporterIds`, `assigneeIds`, `moduleCodes`, `versionCodes`, `environmentCodes`, `includeAssigneeParticipants`, `sortBy`, `sortOrder`, `assigneeId`, and `verifierId`.

## Issue Write Endpoints

All use Personal Token.

- `POST /api/personal/projects/:projectKey/issues/:issueId/comments`
  - Scope: `issue:comment:write`
  - Body: `{ "content": string, "mentions"?: string[] }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/assign`
  - Scope: `issue:assign:write`
  - Body: `{ "assigneeId": string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/claim`
  - Scope: `issue:assign:write`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches`
  - Scope: `issue:branch:write`
  - Body: `{ "ownerUserId": string, "title": string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/start-mine`
  - Scope: `issue:branch:write`
  - Body: `{ "title": string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/:branchId/start`
  - Scope: `issue:branch:write`
- `POST /api/personal/projects/:projectKey/issues/:issueId/branches/:branchId/complete`
  - Scope: `issue:branch:write`
  - Body: `{ "summary"?: string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/start`
- `POST /api/personal/projects/:projectKey/issues/:issueId/wait-update`
- `POST /api/personal/projects/:projectKey/issues/:issueId/resolve`
  - Body: `{ "resolutionSummary"?: string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/verify`
- `POST /api/personal/projects/:projectKey/issues/:issueId/reopen`
  - Body: `{ "remark"?: string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/close`
  - Body: `{ "reason"?: string, "remark"?: string }`
- `POST /api/personal/projects/:projectKey/issues/:issueId/participants`
  - Scope: `issue:participant:write`
  - Body: `{ "userId": string, "taskTitle"?: string }`
- `DELETE /api/personal/projects/:projectKey/issues/:issueId/participants/:participantId`
  - Scope: `issue:participant:write`

Issue transition state machine:

- `claim`: `open|reopened|in_progress|pending_update -> same status`
- `assign`: `open|in_progress|pending_update|reopened -> same status`
- `start`: `open|reopened|pending_update -> in_progress`
- `wait_update`: `in_progress|reopened -> pending_update`
- `resolve`: `in_progress|pending_update|reopened -> resolved`
- `verify`: `resolved -> verified`
- `reopen`: `resolved|verified|closed -> reopened`
- `close`: `open|in_progress|pending_update|resolved|verified|reopened -> closed`

## RD Read Endpoints

All require Project Token with `rd:read`.

- `GET /api/token/projects/:projectKey/rd-stages`
- `GET /api/token/projects/:projectKey/rd-items`
- `GET /api/token/projects/:projectKey/rd-items/:itemId`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/logs`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/stage-history`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/progress`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/progress/history`
- `GET /api/token/projects/:projectKey/rd-items/:itemId/uploads/:uploadId/raw`
- `GET /api/token/projects/:projectKey/issues?rdItemId=:itemId`

RD list query supports `page`, `pageSize`, `stageId`, `stageIds`, `status`, `type`, `priority`, `assigneeIds`, `assigneeId`, `keyword`, `sortBy`, and `sortOrder`.

## RD Write Endpoints

All use Personal Token.

- `POST /api/personal/projects/:projectKey/rd-items/:itemId/start`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/block`
  - Body: `{ "blockerReason"?: string }`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/resume`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/complete`
  - Body: `{ "reason"?: string }`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/accept`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/reopen`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/close`
  - Body: `{ "reason"?: string }`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/advance-stage`
  - Body: `{ "stageId": string, "memberIds"?: string[], "description"?: string, "planStartAt"?: string, "planEndAt"?: string, "stageTasks"?: object[], "stageTaskTemplates"?: object[] }`
- `POST /api/personal/projects/:projectKey/rd-items/:itemId/progress`
  - Body: `{ "progress": number, "note"?: string, "blockReason"?: string, "resolveBlockId"?: string, "stageTaskId"?: string }`
- `PATCH /api/personal/projects/:projectKey/rd-items/:itemId`
  - Body: `{ "version": number, "title"?: string, "description"?: string|null, "stageId"?: string|null, "type"?: string, "priority"?: string, "memberIds"?: string[], "verifierId"?: string|null, "planStartAt"?: string|null, "planEndAt"?: string|null, "stageDescription"?: string|null }`

RD transition state machine:

- `todo -> doing`
- `doing -> blocked`
- `blocked -> doing`
- `doing -> done`
- `done -> accepted`
- `todo|doing|blocked|done|accepted -> closed`
- `closed -> todo`
- `accepted -> todo` after `advance-stage`

Only `accepted` status allows `advance-stage`.
