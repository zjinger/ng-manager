# Hub V2 WebSocket 实时通知规范

## 1. 文档目的

本文档定义 Hub V2 的 WebSocket 实时通知标准，统一事件链路、消息协议、前端刷新机制与验收标准，作为后续开发与联调的唯一基线。

## 2. 适用范围

- 服务端：`EventBus`、`ws-bridge`、`WsHub`
- Web 端：`WsClientService`、`RealtimeSyncService`、Dashboard/通知/导航刷新逻辑
- 业务域：`issue`、`rd`、`announcement`、`document`、`release`

## 3. 架构与链路

1. 业务模块执行写操作后发布 `DomainEvent`。
2. `EventBus` 将领域事件分发至 `ws-bridge`。
3. `ws-bridge` 依据实体类型生成标准 WS 消息。
4. `WsHub` 按项目权限与当前订阅项目推送消息。
5. Web 端统一由 `RealtimeSyncService` 消费消息并触发对应刷新。

## 4. 消息协议

### 4.1 公共字段

- `type`: 消息类型
- `ts`: ISO 时间戳
- `projectId`: 项目标识，可选；无值表示全局消息
- `payload`: 业务负载

### 4.2 消息类型

#### `notification.changed`

用于通知中心与动态相关刷新。

```json
{
  "type": "notification.changed",
  "ts": "2026-03-30T00:00:00.000Z",
  "projectId": "prj_xxx",
  "payload": {
    "entityType": "issue",
    "entityId": "iss_xxx",
    "action": "update",
    "hints": ["notification", "dashboard", "badge"]
  }
}
```

#### `badge.changed`

用于导航徽标刷新。

```json
{
  "type": "badge.changed",
  "ts": "2026-03-30T00:00:00.000Z",
  "projectId": "prj_xxx",
  "payload": {
    "entityType": "issue",
    "hints": ["badge"]
  }
}
```

#### `dashboard.changed`

用于 Dashboard 分片刷新。

```json
{
  "type": "dashboard.changed",
  "ts": "2026-03-30T00:00:00.000Z",
  "projectId": "prj_xxx",
  "payload": {
    "entityType": "document",
    "entityId": "doc_xxx",
    "action": "publish",
    "hints": ["dashboard"]
  }
}
```

## 5. 刷新意图（hints）规范

`hints` 表示刷新目标，不表示业务语义。

- `notification`: 刷新通知中心数据
- `badge`: 刷新侧栏 Issue/RD 徽标
- `dashboard`: 刷新 Dashboard 数据

约束：

- 服务端必须在可判定场景下显式携带 `hints`
- 前端仅根据 `hints` 决定刷新动作，不再依赖页面分散判断

## 6. 前端刷新机制

### 6.1 统一调度

Web 端仅允许 `RealtimeSyncService` 直接消费 WS 消息，业务页面不直接订阅原始 WS。

### 6.2 刷新矩阵

| `hints` | 目标模块 | 执行动作 |
| --- | --- | --- |
| `notification` | 通知中心 | `NotificationStore.load()` |
| `badge` | 导航徽标 | `NavigationBadgeStore.load()` |
| `dashboard` | Dashboard | `DashboardRefreshBus.notify()` |

### 6.3 防抖窗口

- 通知刷新：`120ms`
- 徽标刷新：`120ms`
- Dashboard 刷新：`200ms`

## 7. Dashboard 精准更新机制

### 7.1 分片接口

- `GET /api/admin/dashboard/stats`
- `GET /api/admin/dashboard/todos`
- `GET /api/admin/dashboard/activities`
- `GET /api/admin/dashboard/announcements`
- `GET /api/admin/dashboard/documents`

### 7.2 分片更新规则

`dashboard` 刷新事件进入页面后，按 `entityType` 精准更新：

- `issue` / `rd`：刷新 `stats`、`todos`、`activities`
- `announcement`：刷新 `announcements`、`activities`
- `document`：刷新 `documents`、`activities`
- `release`：刷新 `activities`

页面必须采用静默更新，不触发整页 loading 覆盖层。

## 8. 项目范围过滤规则

- 消息包含 `projectId` 且不等于当前项目：丢弃
- 消息不包含 `projectId`：按全局消息处理

## 9. 可靠性与兼容

- `WsClientService` 负责自动重连、心跳与项目订阅同步
- 若消息缺失 `hints`，前端按默认映射降级处理，保证兼容旧消息
- 发生分片刷新失败时，Dashboard 可回退到一次静默整包刷新

## 10. 验收标准

1. 业务写操作后，相关页面在 1s 内可见最新状态。
2. Dashboard 刷新无整页闪烁。
3. 项目切换后，仅接收当前项目实时消息。
4. WebSocket 断开后可自动恢复并继续接收消息。
