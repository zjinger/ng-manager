# hub-client SDK 设计文档

最后更新：2026-03-06

## 目的

`hub-client` 是供以下客户端复用的 SDK：

- ngm-cli
- ngm-desktop

其作用是 **统一封装 ngm-hub 的访问逻辑**。

设计目标：

- 降低客户端与 Hub API 的耦合
- 提供统一接口
- 支持 Hub 不可用时的降级

---

# 包结构

```
packages/hub-client
```

---

# 目录结构

```
packages/hub-client
├─ src
│  ├─ hub-client.ts
│  ├─ feedback-client.ts
│  ├─ announcement-client.ts
│  ├─ release-client.ts
│  ├─ ws-client.ts
│  └─ types.ts
```

---

# HubClient 接口

```ts
export interface HubClientOptions {
  baseUrl: string
  timeoutMs?: number
}
```

核心接口：

```ts
export interface HubClient {

  listAnnouncements(): Promise<AnnouncementSummary[]>

  getLatestRelease(channel: "desktop" | "cli"):
    Promise<ReleaseSummary | null>

  submitFeedback(input: CreateFeedbackInput):
    Promise<{ id: string }>

  connectWs(handler:(event:HubWsEvent)=>void):
    { close():void }

}
```

---

# 反馈 API

```
POST /api/client/feedback
POST /api/client/feedback/:id/attachments
```

示例：

```ts
await hubClient.submitFeedback({
  type:"bug",
  title:"CLI 启动失败",
  content:"执行 ngm ui 时出现错误"
})
```

---

# 公告 API

```
GET /api/client/announcements
GET /api/client/announcements/:id
```

Desktop 可用于展示公告通知。

---

# 版本检测 API

```
GET /api/client/releases/latest
```

示例响应：

```json
{
  "version":"0.3.0",
  "title":"新版本发布",
  "downloadUrl":"https://downloads/ngm-0.3.0.exe"
}
```

---

# WebSocket 客户端

连接地址：

```
/ws
```

示例：

```ts
const ws = hubClient.connectWs(event => {
  if(event.type === "release.published"){
    console.log("发现新版本")
  }
})
```

---

# 错误处理策略

如果 Hub 不可用：

- 不抛出致命错误
- 保证本地功能继续运行
- 客户端可以静默失败或提示

---

# 总结

hub-client SDK 的目标是保证 **客户端与 Hub 解耦**，并保持系统稳定。
