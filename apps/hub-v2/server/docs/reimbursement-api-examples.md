# 报销模块 API 示例请求

本文档提供前端联调可直接参考的请求体示例，字段说明请配合 [reimbursement-api-contract.md](D:/ng-manager/apps/hub-v2/server/docs/reimbursement-api-contract.md:1) 一起使用。

## 1. 差旅报销草稿

`POST /api/admin/reimbursements/claims`

说明：差旅报销以下字段必填：

1. `travelStartDate`
2. `travelStartHalf`
3. `travelEndDate`
4. `travelEndHalf`
5. `travelDays`

```json
{
  "claimType": "travel",
  "reason": "上海到杭州客户拜访差旅报销",
  "fillDate": "2026-05-15",
  "travelStartDate": "2026-05-14",
  "travelStartHalf": "am",
  "travelEndDate": "2026-05-15",
  "travelEndHalf": "pm",
  "travelDays": 2,
  "receiptCount": 8,
  "advanceAmount": 300,
  "attachments": [
    {
      "uploadId": "upl_invoice_001",
      "category": "invoice"
    },
    {
      "uploadId": "upl_itinerary_001",
      "category": "itinerary"
    }
  ],
  "items": [
    {
      "itemType": "travel",
      "category": "交通费",
      "description": "上海虹桥至杭州东高铁二等座",
      "occurredDate": "2026-05-14",
      "fromLocation": "上海",
      "toLocation": "杭州",
      "amount": 73.5,
      "meta": {
        "vehicle": "train",
        "ticketType": "second_class",
        "tripDirection": "go"
      },
      "sort": 10
    },
    {
      "itemType": "travel",
      "category": "住宿费",
      "description": "杭州城西酒店一晚",
      "startDate": "2026-05-14",
      "endDate": "2026-05-15",
      "amount": 428,
      "meta": {
        "hotelName": "杭州城西酒店",
        "roomNights": 1
      },
      "sort": 20
    },
    {
      "itemType": "travel",
      "category": "市内交通",
      "description": "往返出租车",
      "occurredDate": "2026-05-14",
      "amount": 96,
      "meta": {
        "vehicle": "taxi"
      },
      "sort": 30
    }
  ]
}
```

## 2. 普通费用报销草稿

`POST /api/admin/reimbursements/claims`

```json
{
  "claimType": "general",
  "reason": "办公用品采购报销",
  "fillDate": "2026-05-15",
  "receiptCount": 5,
  "advanceAmount": 0,
  "attachments": [
    {
      "uploadId": "upl_invoice_101",
      "category": "invoice"
    }
  ],
  "items": [
    {
      "itemType": "general",
      "category": "办公用品",
      "description": "打印纸与签字笔",
      "occurredDate": "2026-05-13",
      "amount": 186.4,
      "meta": {
        "vendorName": "晨光办公",
        "invoiceNo": "FP20260513001"
      },
      "sort": 10
    },
    {
      "itemType": "general",
      "category": "行政费用",
      "description": "会议室临时物资",
      "occurredDate": "2026-05-14",
      "amount": 88,
      "meta": {
        "vendorName": "便利蜂"
      },
      "sort": 20
    }
  ]
}
```

## 3. 编辑草稿

`PATCH /api/admin/reimbursements/claims/:claimId`

说明：

1. 如果传 `items`，后端会整单替换明细
2. 因此前端保存时应提交完整的 `items` 数组，而不是只传变更那一行

```json
{
  "departmentId": "dep_rd",
  "reason": "上海到杭州客户拜访差旅报销（补充住宿）",
  "fillDate": "2026-05-15",
  "travelStartDate": "2026-05-14",
  "travelStartHalf": "am",
  "travelEndDate": "2026-05-15",
  "travelEndHalf": "pm",
  "travelDays": 2,
  "receiptCount": 9,
  "advanceAmount": 300,
  "items": [
    {
      "itemType": "travel",
      "category": "交通费",
      "description": "上海虹桥至杭州东高铁二等座",
      "occurredDate": "2026-05-14",
      "fromLocation": "上海",
      "toLocation": "杭州",
      "amount": 73.5,
      "sort": 10
    },
    {
      "itemType": "travel",
      "category": "住宿费",
      "description": "杭州城西酒店一晚",
      "startDate": "2026-05-14",
      "endDate": "2026-05-15",
      "amount": 428,
      "sort": 20
    },
    {
      "itemType": "travel",
      "category": "餐补",
      "description": "客户拜访当天餐补",
      "occurredDate": "2026-05-14",
      "amount": 80,
      "sort": 30
    }
  ]
}
```

## 4. 绑定附件

前置条件：

1. 先上传文件到 `/api/admin/uploads`
2. 上传时使用 `bucket=reimbursements`、`category=attachment`
3. 上传成功后得到 `uploadId`
4. 如果草稿还没创建，也可以把这些 `uploadId` 直接放进 `POST /claims` 的 `attachments` 字段

`POST /api/admin/reimbursements/claims/:claimId/attachments`

```json
{
  "uploadId": "upl_invoice_001",
  "category": "invoice"
}
```

附件类别示例：

1. 发票：`invoice`
2. 行程单：`itinerary`
3. 付款证明：`payment_proof`
4. 其他：`other`

## 5. 提交审批

`POST /api/admin/reimbursements/claims/:claimId/submit`

请求体为空：

```json
{}
```

## 6. 审批通过

`POST /api/admin/reimbursements/claims/:claimId/approve`

```json
{
  "taskId": "rbt_current_pending_task",
  "comment": "同意报销"
}
```

## 7. 审批驳回

`POST /api/admin/reimbursements/claims/:claimId/reject`

```json
{
  "taskId": "rbt_current_pending_task",
  "comment": "请补充发票附件"
}
```

## 8. 审批转交

`POST /api/admin/reimbursements/claims/:claimId/transfer`

```json
{
  "taskId": "rbt_current_pending_task",
  "targetUserId": "usr_target_001",
  "comment": "转交给实际费用归口负责人"
}
```

## 9. 审批加签

`POST /api/admin/reimbursements/claims/:claimId/add-sign`

```json
{
  "taskId": "rbt_current_pending_task",
  "targetUserId": "usr_target_002",
  "comment": "请财务同事先复核票据"
}
```

## 10. 工作台与列表查询示例

### 10.1 工作台

`GET /api/admin/reimbursements/dashboard`

### 10.2 我的报销列表

`GET /api/admin/reimbursements/claims?page=1&pageSize=20&scope=my&status=approving`

### 10.3 待我审批列表

`GET /api/admin/reimbursements/claims?page=1&pageSize=20&scope=todo`

### 10.4 全量统计

`GET /api/admin/reimbursements/stats?dateFrom=2026-05-01&dateTo=2026-05-31&claimType=travel`

## 11. 前端建议的最小联调顺序

1. 调登录接口拿到 cookie
2. 先调 `/api/admin/uploads` 上传附件，拿到 `uploadId`
3. `POST /claims` 创建草稿；可省略 `departmentId`，由后端自动取当前用户主部门，也可在此步直接传 `attachments`
4. 如需后续继续补传附件，再调 `POST /claims/:claimId/attachments`
5. `PATCH /claims/:claimId` 保存完整明细
6. `POST /claims/:claimId/submit` 提交审批
7. `GET /claims/:claimId` 拉详情，读取 `tasks + approvalPreview`
8. 如需局部刷新审批步骤，可单独调 `GET /claims/:claimId/approval-preview`
9. 审批人再调 `approve/reject/transfer/add-sign`
