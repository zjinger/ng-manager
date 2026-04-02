# Hub V2 WebSocket 实时通知机制（实现对齐版）

## 1. 文档目的

本文档描述 Hub V2 当前线上代码中的 WebSocket 实时通知机制，作为联调、排障和后续迭代的基线。

## 2. 适用范围

- 服务端
  - `EventBus`
  - `notification-bridge`（通知专用桥）
  - `ws-bridge`（轻量刷新提示桥）
  - `WsHub` / `ws.plugin`
- Web 端
  - `WsClientService`
  - `RealtimeSyncService`
  - `NotificationStore`
- 业务域
  - `issue`、`rd`、`announcement`、`document`、`release`、`project(member)`

## 3. 总体架构

当前采用“双桥接”模型：

1. 业务模块写操作后发布 `DomainEvent`
2. `EventBus` 并行分发给两个订阅桥接器
3. `notification-bridge` 负责“通知入库 + 增量推送”
4. `ws-bridge` 负责“dashboard/badge 轻量失效提示”

### 3.1 通知专用桥（notification-bridge）

- 调用 `notificationIngest.ingestDomainEvent(event)`
- 在通知服务中完成
  - 事件归一化
  - 收件人推导
  - 用户偏好过滤（`inbox` + 事件开关）
  - 去重写入 `user_notifications`
- 对每个收件人推送 `notification.new`（包含完整通知项和最新未读数）

### 3.2 轻量提示桥（ws-bridge）

- 仅发送
  - `dashboard.changed`
  - `badge.changed`（仅 `issue/rd`）
- 不再负责通知列表数据本体
- 广播优先级
  1. `affectedUserIds`
  2. `projectId` 对应项目成员
  3. 全局广播

## 4. 实时消息协议

## 4.1 公共字段

- `type`: 消息类型
- `ts`: ISO 时间戳
- `projectId`: 可选，项目范围消息携带
- `payload`: 业务载荷

## 4.2 消息类型（当前有效）

### `server.hello`

连接建立后的握手消息，返回连接 id。

### `notification.new`

通知新增/更新的增量消息。

```json
{
  "type": "notification.new",
  "ts": "2026-04-02T00:00:00.000Z",
  "projectId": "prj_xxx",
  "payload": {
    "notificationId": "noti_xxx",
    "unreadCount": 12,
    "notification": {
      "id": "noti_xxx",
      "kind": "activity",
      "category": "issue_mention",
      "title": "测试单 ISSUE-123",
      "description": "ISSUE-123 · 张三: 请 @李四 看下这条",
      "sourceLabel": "测试单动态",
      "projectName": "核心平台",
      "time": "2026-04-02T00:00:00.000Z",
      "route": "/issues?detail=iss_xxx",
      "unread": true,
      "projectId": "prj_xxx"
    },
    "entityType": "issue",
    "entityId": "iss_xxx",
    "action": "commented"
  }
}
```

### `notification.unread`

未读计数同步消息（例如用户标记已读后广播给该用户全部会话）。

```json
{
  "type": "notification.unread",
  "ts": "2026-04-02T00:00:00.000Z",
  "payload": {
    "unreadCount": 11
  }
}
```

### `badge.changed`

导航徽标刷新提示。

### `dashboard.changed`

Dashboard 刷新提示。

### `system.ping`

服务端心跳消息，客户端回复 `system.pong`。

## 4.3 兼容消息

- `notification.changed` 仍被前端兼容处理（降级 reload），但当前服务端主链路不再依赖它做通知列表更新。

## 5. 通知数据模型与分类

## 5.1 `kind`

- `todo`
- `activity`

## 5.2 `category`

- `issue_todo`
- `issue_mention`
- `issue_activity`
- `rd_todo`
- `rd_activity`
- `announcement`
- `document`
- `release`
- `project_member`

## 5.3 去重策略（入库层）

- `todo`: 同用户 + 同实体 + 同动作，5 分钟窗口合并
- `activity`: 同用户 + 同实体，10 分钟窗口合并

## 6. 收件人与偏好过滤

通知服务先推导候选收件人，再按偏好过滤：

- 渠道开关：`channels.inbox`
- 事件开关：`events.*`

事件开关与分类对齐关系：

- `issue_todo` -> `issue_todo`
- `issue_mention` -> `issue_mentioned`
- `issue_activity` -> `issue_activity`
- `rd_todo` -> `rd_todo`
- `rd_activity` -> `rd_activity`
- `announcement` -> `announcement_published`
- `document` -> `document_published`
- `release` -> `release_published`
- `project_member` -> `project_member_changed`

说明：

- `project_member_changed` 现已接通成员新增/角色变更/移除的通知链路。
- 若用户未保存偏好记录，使用服务端默认值。

## 7. 前端消费机制

统一由 `RealtimeSyncService` 消费 WS：

- `notification.new`
  - 调用 `NotificationStore.upsertFromWs(...)`
  - 直接增量更新列表和未读计数，不做全量 reload
- `notification.unread`
  - 调用 `NotificationStore.setUnreadCount(...)`
- `badge.changed`
  - 120ms 防抖刷新导航徽标
- `dashboard.changed`
  - 200ms 合并刷新 Dashboard
- `notification.changed`（兼容）
  - 120ms 防抖走 `NotificationStore.load()` 降级刷新

`NotificationStore` 关键行为：

- 路由感知增量更新
  - 在通知页仅更新匹配当前查询且 `page=1` 的项
- 未读本地乐观更新 + 服务端权威回写

## 8. 连接与可靠性

## 8.1 服务端

- WS 入口：`/api/admin/ws`
- 鉴权：JWT 校验
- 心跳：定时 `ping` / `system.ping`
- 会话维度推送：按 `userId` 聚合多端会话
- 项目维度推送：按会话可访问项目集合过滤

## 8.2 客户端

- 自动重连（指数退避 + 抖动）
- 收到 `system.ping` 回 `system.pong`
- 若握手失败并返回 `1008 forbidden`，停止自动重连

## 9. 与旧文档差异（关键）

- 通知列表实时更新主路径已从 `notification.changed + load()` 升级为 `notification.new` 增量 upsert。
- 消息桥接拆分为 `notification-bridge` 与 `ws-bridge`，职责清晰分离。
- 通知支持 `category` 细分类，并与偏好事件开关一一对齐。
- 新增 `project_member` 实时通知类别，支持“成员变更”偏好开关。

## 10. 验收标准

1. 业务写操作后，目标用户在 1 秒内收到实时通知（含未读数同步）。
2. 通知列表与通知弹窗在不全量刷新情况下可增量更新。
3. 多端同账号下，任一端已读后其余端未读数同步。
4. 项目成员新增/角色变更/移除时，目标用户可收到“成员变更”通知。
5. 用户关闭某事件偏好后，不再收到对应类别通知。
