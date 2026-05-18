# 报销模块 API 联调说明

本文档面向 `apps/hub-v2/web` 前端联调，基于当前后端实现整理报销模块的接口契约、字段说明和调用约束。

适用范围：

1. 报销单草稿创建/编辑
2. 附件绑定
3. 提交审批与审批动作
4. 工作台、列表、详情、统计
5. Word 导出

不包含：

1. 旧系统历史数据迁移
2. 付款归档
3. 通用流程引擎说明

## 1. 通用约定

### 1.1 路径前缀

所有报销接口路径前缀统一为：

`/api/admin/reimbursements`

### 1.2 认证

所有接口都要求已登录，使用管理端登录 cookie。

### 1.3 成功响应包装

所有 JSON 成功响应统一为：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

分页响应中的 `data` 结构统一为：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

### 1.4 金额字段

所有 API 暴露给前端的金额字段统一为 `number`，单位是“元”，允许两位小数。

### 1.5 日期字段

1. 业务日期字段如 `fillDate / occurredDate / startDate / endDate` 当前按字符串传输，建议前端统一使用 `YYYY-MM-DD`
2. 系统时间字段如 `createdAt / updatedAt / submittedAt / completedAt / actedAt` 为 ISO 字符串

## 2. 枚举

### 2.1 报销单类型 `claimType`

- `travel`: 差旅报销
- `general`: 普通费用报销

### 2.2 报销单状态 `status`

- `draft`: 草稿
- `submitted`: 已提交
- `approving`: 审批中
- `rejected`: 已驳回
- `completed`: 已完成
- `cancelled`: 已取消

说明：当前实现中提交后会直接进入 `approving`，`submitted` 预留但前端仍应兼容。

### 2.3 报销明细类型 `itemType`

- `travel`
- `general`

说明：创建/编辑时可不传，后端默认使用单据的 `claimType`。

### 2.4 附件类别 `category`

- `invoice`: 发票
- `itinerary`: 行程单
- `payment_proof`: 付款证明
- `other`: 其他

### 2.5 审批任务状态 `task.status`

- `pending`: 待处理
- `approved`: 已通过
- `rejected`: 已驳回
- `transferred`: 已转交
- `addsign_pending`: 加签待处理
- `cancelled`: 已取消

### 2.6 列表查询范围 `scope`

- `my`: 我的报销
- `all`: 全部报销
- `todo`: 待我审批

## 3. 核心数据结构

## 3.1 报销单 `ReimbursementClaim`

```json
{
  "id": "rbc_xxx",
  "claimNo": "CL-202605-001",
  "claimType": "travel",
  "status": "draft",
  "applicantUserId": "usr_xxx",
  "applicantName": "张三",
  "departmentId": "dep_xxx",
  "departmentName": "财务部",
  "reason": "上海出差报销",
  "fillDate": "2026-05-15",
  "travelStartDate": "2026-05-13",
  "travelStartHalf": "am",
  "travelEndDate": "2026-05-15",
  "travelEndHalf": "pm",
  "travelDays": 3,
  "receiptCount": 12,
  "totalAmount": 1234.56,
  "advanceAmount": 200,
  "balanceAmount": 1034.56,
  "currentStageCode": "direct_manager",
  "currentStageName": "直属主管审批",
  "submittedAt": "2026-05-15T09:00:00.000Z",
  "completedAt": null,
  "createdAt": "2026-05-15T08:00:00.000Z",
  "updatedAt": "2026-05-15T09:00:00.000Z"
}
```

字段说明：

1. `claimNo`: 后端生成的报销编号，前端创建时不传
2. `travelStartDate/travelStartHalf/travelEndDate/travelEndHalf/travelDays`: 差旅报销主表字段；普通费用报销可为 `null`
3. `receiptCount`: 单据数量/张数，差旅和普通费用都可传
4. `totalAmount`: 后端按 `items[].amount` 自动汇总
5. `advanceAmount`: 预支金额，前端可传
6. `balanceAmount`: 后端计算值，等于 `totalAmount - advanceAmount`
7. `currentStageCode/currentStageName`: 当前审批节点，草稿时为空

## 3.2 报销明细 `ReimbursementItem`

```json
{
  "id": "rbi_xxx",
  "claimId": "rbc_xxx",
  "itemType": "travel",
  "category": "交通费",
  "description": "高铁二等座",
  "occurredDate": "2026-05-14",
  "startDate": null,
  "endDate": null,
  "fromLocation": "上海",
  "toLocation": "杭州",
  "amount": 123.5,
  "meta": {
    "vehicle": "train",
    "ticketNo": "E123456"
  },
  "sort": 10,
  "createdAt": "2026-05-15T08:00:00.000Z",
  "updatedAt": "2026-05-15T08:00:00.000Z"
}
```

字段说明：

1. `category`: 明细类别，自由字符串，前端按设计稿控件传
2. `description`: 明细说明
3. `occurredDate`: 普通费用或单次发生日期
4. `startDate/endDate`: 行程起止日期
5. `fromLocation/toLocation`: 差旅行程起止地
6. `meta`: 扩展字段对象，后端原样保存，不做结构校验
7. `sort`: 排序值，建议前端按 10、20、30 递增传输

## 3.3 附件 `ReimbursementAttachment`

```json
{
  "id": "rba_xxx",
  "claimId": "rbc_xxx",
  "uploadId": "upl_xxx",
  "category": "invoice",
  "fileName": "invoice.pdf",
  "originalName": "发票.pdf",
  "mimeType": "application/pdf",
  "fileSize": 102400,
  "createdByUserId": "usr_xxx",
  "createdAt": "2026-05-15T08:00:00.000Z"
}
```

### 3.4 审批任务 `ReimbursementApprovalTask`

```json
{
  "id": "rbt_xxx",
  "claimId": "rbc_xxx",
  "templateId": "apt_xxx",
  "templateStageId": "aps_xxx",
  "stageCode": "direct_manager",
  "stageName": "直属主管审批",
  "stageType": "approval",
  "resolverType": "direct_manager",
  "resolverRef": null,
  "assigneeUserId": "usr_manager",
  "assigneeName": "李经理",
  "status": "pending",
  "sort": 10,
  "parentTaskId": null,
  "transferredFromTaskId": null,
  "comment": null,
  "actedAt": null,
  "createdAt": "2026-05-15T09:00:00.000Z",
  "updatedAt": "2026-05-15T09:00:00.000Z"
}
```

字段说明：

1. `parentTaskId != null` 表示这是加签子任务
2. `transferredFromTaskId != null` 表示这是转交后生成的新任务
3. 同一审批节点如果有多个处理人，任一人处理后，其余同级任务会被取消

### 3.5 操作日志 `ReimbursementLog`

```json
{
  "id": "rbl_xxx",
  "claimId": "rbc_xxx",
  "actorUserId": "usr_xxx",
  "actorName": "张三",
  "action": "submit",
  "taskId": null,
  "comment": "submit reimbursement claim",
  "createdAt": "2026-05-15T09:00:00.000Z"
}
```

`action` 可能值：

- `create`
- `update`
- `submit`
- `approve`
- `reject`
- `transfer`
- `add_sign`
- `attachment.added`
- `attachment.removed`

## 4. 接口清单

## 4.1 `GET /dashboard`

返回当前用户工作台摘要：

```json
{
  "todoCount": 2,
  "myApprovingCount": 3,
  "completedThisMonthAmount": 5600.5,
  "recentTodos": [],
  "recentClaims": []
}
```

字段说明：

1. `todoCount`: 待我审批数量
2. `myApprovingCount`: 我提交且仍在审批中的单据数
3. `completedThisMonthAmount`: 本月已完成单据金额汇总
4. `recentTodos/recentClaims`: 元素结构均为 `ReimbursementClaim`

## 4.2 `GET /claims`

分页查询报销单。

查询参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | `number` | 否 | 页码，默认 `1` |
| `pageSize` | `number` | 否 | 每页数量，默认 `20`，最大 `100` |
| `scope` | `"my" \| "all" \| "todo"` | 否 | 查询范围 |
| `claimType` | `"travel" \| "general"` | 否 | 报销单类型 |
| `status` | `"draft" \| "submitted" \| "approving" \| "rejected" \| "completed" \| "cancelled"` | 否 | 报销状态 |
| `departmentId` | `string` | 否 | 部门 ID |
| `keyword` | `string` | 否 | 关键字，匹配编号/事由/申请人等 |
| `dateFrom` | `string` | 否 | 起始日期，建议 `YYYY-MM-DD` |
| `dateTo` | `string` | 否 | 结束日期，建议 `YYYY-MM-DD` |

返回：

`data.items` 的元素结构为 `ReimbursementClaim`。

## 4.3 `POST /claims`

创建报销草稿。

请求体：

```json
{
  "claimType": "travel",
  "departmentId": "dep_xxx",
  "reason": "上海出差报销",
  "fillDate": "2026-05-15",
  "travelStartDate": "2026-05-13",
  "travelStartHalf": "am",
  "travelEndDate": "2026-05-15",
  "travelEndHalf": "pm",
  "travelDays": 3,
  "receiptCount": 12,
  "advanceAmount": 200,
  "items": [
    {
      "itemType": "travel",
      "category": "交通费",
      "description": "高铁二等座",
      "occurredDate": "2026-05-14",
      "fromLocation": "上海",
      "toLocation": "杭州",
      "amount": 123.5,
      "meta": {
        "vehicle": "train"
      },
      "sort": 10
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `claimType` | `"travel" \| "general"` | 是 | 报销单类型 |
| `departmentId` | `string` | 是 | 归属部门 ID |
| `reason` | `string` | 是 | 报销事由，1-255 字符 |
| `fillDate` | `string` | 否 | 填报日期，不传则后端默认当天 |
| `travelStartDate` | `string \| null` | 否 | 差旅开始日期，建议 `YYYY-MM-DD` |
| `travelStartHalf` | `"am" \| "pm" \| null` | 否 | 差旅开始时段，`am=上午`，`pm=下午` |
| `travelEndDate` | `string \| null` | 否 | 差旅结束日期，建议 `YYYY-MM-DD` |
| `travelEndHalf` | `"am" \| "pm" \| null` | 否 | 差旅结束时段，`am=上午`，`pm=下午` |
| `travelDays` | `number \| null` | 否 | 出差天数，支持 `0.5` |
| `receiptCount` | `number \| null` | 否 | 单据数量/张数 |
| `advanceAmount` | `number` | 否 | 预支金额，不传默认 `0` |
| `items` | `ReimbursementItemInput[]` | 否 | 报销明细列表 |

返回：

`data` 为完整 `ReimbursementClaimDetail`。

## 4.4 `GET /claims/:claimId`

获取单据详情。

返回：

```json
{
  "id": "rbc_xxx",
  "...claim fields": "...",
  "items": [],
  "attachments": [],
  "tasks": [],
  "logs": []
}
```

说明：

1. `items` 使用 `ReimbursementItem[]`
2. `attachments` 使用 `ReimbursementAttachment[]`
3. `tasks` 使用 `ReimbursementApprovalTask[]`
4. `logs` 使用 `ReimbursementLog[]`

## 4.5 `PATCH /claims/:claimId`

编辑报销草稿。

调用约束：

1. 仅申请人本人或 admin 可操作
2. 仅 `draft` 或 `rejected` 状态允许编辑
3. `rejected` 状态重新编辑后，后端会把状态重置为 `draft`

请求体：

```json
{
  "departmentId": "dep_xxx",
  "reason": "更新后的报销事由",
  "fillDate": "2026-05-15",
  "travelStartDate": "2026-05-13",
  "travelStartHalf": "am",
  "travelEndDate": "2026-05-15",
  "travelEndHalf": "pm",
  "travelDays": 3,
  "receiptCount": 12,
  "advanceAmount": 300,
  "items": [
    {
      "category": "住宿费",
      "description": "酒店住宿",
      "amount": 480,
      "sort": 10
    }
  ]
}
```

说明：

1. 所有字段均可选
2. 如果传 `items`，后端会整单替换原有明细
3. 如果不传 `items`，保留原明细

返回：

`data` 为完整 `ReimbursementClaimDetail`。

## 4.6 `POST /claims/:claimId/submit`

提交审批。

调用约束：

1. 仅申请人本人或 admin 可操作
2. 仅 `draft` 或 `rejected` 状态允许提交
3. 后端固定读取启用的审批模板 `expense_default`
4. 若审批模板缺失、无阶段、解析不到审批人，返回 `400`

请求体：无

返回：

`data` 为完整 `ReimbursementClaimDetail`，其中会带回已生成的 `tasks`。

## 4.7 `POST /claims/:claimId/approve`

审批通过。

请求体：

```json
{
  "taskId": "rbt_xxx",
  "comment": "同意"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `taskId` | `string` | 是 | 当前用户待处理任务 ID |
| `comment` | `string \| null` | 否 | 审批意见 |

调用约束：

1. 仅当前任务处理人或 admin 可操作
2. 任务状态必须是 `pending` 或 `addsign_pending`
3. 最后一个审批节点通过后，单据状态变为 `completed`

## 4.8 `POST /claims/:claimId/reject`

审批驳回。

请求体与 `approve` 相同：

```json
{
  "taskId": "rbt_xxx",
  "comment": "请补充附件"
}
```

调用结果：

1. 当前任务置为 `rejected`
2. 其他未处理任务会被取消
3. 单据状态变为 `rejected`
4. 申请人可再次编辑并重新提交

## 4.9 `POST /claims/:claimId/transfer`

审批转交。

请求体：

```json
{
  "taskId": "rbt_xxx",
  "targetUserId": "usr_xxx",
  "comment": "转交给实际负责人"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `taskId` | `string` | 是 | 当前用户待处理任务 ID |
| `targetUserId` | `string` | 是 | 转交目标用户 ID |
| `comment` | `string \| null` | 否 | 转交说明 |

调用结果：

1. 原任务状态变为 `transferred`
2. 新建目标用户的 `pending` 任务

## 4.10 `POST /claims/:claimId/add-sign`

审批加签。

请求体：

```json
{
  "taskId": "rbt_xxx",
  "targetUserId": "usr_xxx",
  "comment": "请协助复核"
}
```

调用结果：

1. 新建一个 `addsign_pending` 子任务
2. 子任务完成后，原节点继续流转

## 4.11 `POST /claims/:claimId/attachments`

绑定已上传附件。

前置步骤：

1. 前端先调用上传接口上传文件
2. 上传成功后拿到 `uploadId`
3. 再调用本接口建立报销业务绑定

请求体：

```json
{
  "uploadId": "upl_xxx",
  "category": "invoice"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `uploadId` | `string` | 是 | 上传模块返回的文件 ID |
| `category` | `"invoice" \| "itinerary" \| "payment_proof" \| "other"` | 是 | 附件类别 |

调用约束：

1. 申请人本人、当前审批处理人、admin 可以绑定
2. 若 `uploadId` 不存在，返回 `404`

上传策略建议：

1. 上传接口 bucket/category 使用 `reimbursements/attachment`
2. 当前允许 `JPG / PNG / PDF`
3. 单文件默认上限 `10MB`

## 4.12 `DELETE /claims/:claimId/attachments/:attachmentId`

移除报销附件绑定。

说明：

1. 仅删除报销模块业务绑定
2. 不删除物理上传文件
3. 权限规则与附件绑定相同

返回：

`data` 为最新 `ReimbursementClaimDetail`

## 4.13 `GET /stats`

统计接口。

查询参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `dateFrom` | `string` | 否 | 起始日期 |
| `dateTo` | `string` | 否 | 结束日期 |
| `departmentId` | `string` | 否 | 部门 ID |
| `claimType` | `"travel" \| "general"` | 否 | 报销单类型 |

返回：

```json
{
  "byMonth": [
    {
      "month": "2026-05",
      "totalAmount": 5600.5,
      "count": 6
    }
  ],
  "byType": [
    {
      "claimType": "travel",
      "totalAmount": 3000,
      "count": 3
    }
  ],
  "byDepartment": [
    {
      "departmentId": "dep_xxx",
      "departmentName": "研发部",
      "totalAmount": 2600.5,
      "count": 3
    }
  ],
  "byStatus": [
    {
      "status": "approving",
      "totalAmount": 1200,
      "count": 2
    }
  ]
}
```

权限说明：

1. admin 或具备 `expense.report.view` 的用户可看全量
2. 普通用户只能看到本人数据

## 4.14 `GET /claims/:claimId/export`

导出 Word 报销单。

说明：

1. 返回的是 `.docx` 二进制文件流，不是 JSON
2. 响应头 `Content-Disposition` 带文件名
3. 响应头 `X-Reimbursement-Template-Type` 表示使用的模板类型：
   1. `0`: 不退不补
   2. `1`: 应补
   3. `2`: 应退

权限说明：

1. 申请人本人可导出
2. 审批相关人可导出
3. admin 可导出
4. 具备 `expense.report.view` 的用户可导出

## 5. 前端接入建议

## 5.1 草稿保存

建议前端按以下节奏：

1. `POST /claims` 创建草稿
2. 用返回的 `claimId` 继续维护详情页状态
3. 明细表每次保存时调用 `PATCH /claims/:claimId`

原因：

1. `PATCH` 的 `items` 是整单替换，不适合单条 patch
2. 前端本地保持完整明细数组更简单

## 5.2 附件上传

建议流程：

1. 调上传接口拿到 `uploadId`
2. 调 `POST /claims/:claimId/attachments`
3. 用详情接口回填附件列表

## 5.3 审批页

前端不要自己推断“当前应该调哪个任务”，应当从详情接口里的 `tasks` 中取：

1. 当前用户 `assigneeUserId = 当前用户`
2. `status in ('pending', 'addsign_pending')`

然后把该任务的 `id` 作为 `taskId` 提交到审批动作接口。

## 5.4 差旅明细扩展字段

当前后端对 `items[].meta` 不做结构约束，因此前端可以按设计稿自行组织，例如：

```json
{
  "vehicle": "plane",
  "tripType": "round_trip",
  "city": "北京",
  "days": 2
}
```

但前后端需要约定好字段名，避免后续导出模板映射时再返工。

## 5.5 表单字段归属建议

为避免前端把基础信息和明细字段混放，当前建议按下面口径传输：

1. 差旅基础信息：
   - `reason`
   - `fillDate`
   - `travelStartDate`
   - `travelStartHalf`
   - `travelEndDate`
   - `travelEndHalf`
   - `travelDays`
   - `receiptCount`
2. 普通费用基础信息：
   - `reason`
   - `fillDate`
   - `receiptCount`
3. 行程和费用逐行金额仍放在 `items[]`

## 6. 当前已知实现边界

1. 还没有付款归档接口
2. 还没有旧系统历史报销数据迁移
3. `submitted`、`cancelled` 状态已保留，但 `cancelled` 尚无对外操作接口
4. 审批模板固定读取 `expense_default`
