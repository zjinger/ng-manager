# 24 Issue 与 RD 关联说明

本文档收口测试单 Issue 与研发项 RD 的关联口径。该能力由 `0053_issue_rd_item_link.sql` 引入，是协作域当前的重要实现基线。

## 1. 数据模型

`issues` 新增以下字段：

- `rd_item_id`：关联的研发项 ID。
- `rd_no_snapshot`：关联时的研发项编号快照。
- `rd_title_snapshot`：关联时的研发项标题快照。
- `rd_status_snapshot`：关联时的研发项状态快照。

同时新增索引：

- `idx_issues_rd_item_id`

## 2. 设计目的

- 支持 RD 详情页查看关联测试单。
- 支持 Issue 列表按研发项过滤。
- 支持 Issue 列表和详情直接展示 RD 编号、标题、状态。
- 在 RD 后续变更或关闭后，Issue 仍保留历史关联上下文。

## 3. 查询口径

Project Token 读取接口支持：

- `GET /api/token/projects/:projectKey/issues?rdItemId=:itemId`

Issue 列表与详情返回：

- `rdItemId`
- `rdNoSnapshot`
- `rdTitleSnapshot`
- `rdStatusSnapshot`

关键字检索应同时覆盖 Issue 自身字段和 RD 快照字段，方便按研发项编号或标题定位测试单。

## 4. 写入与状态边界

- 已关闭研发项保留历史关联测试单。
- 已关闭研发项不允许新增或改绑测试单关联。
- 重新绑定时应刷新 RD 快照字段，避免列表展示旧上下文。
- 解绑时应清空 `rd_item_id` 与对应快照字段。

## 5. 关联文档

- [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)
- [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)
- [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)
- [29 项目管理子项目/模块 Phase 2 设计方案](/hub-v2/29-project-module-phase2-design)
