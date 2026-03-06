# ngm-hub Server 架构设计

## 技术栈

- Node.js
- Fastify
- TypeScript
- SQLite
- WebSocket

---

# 目录结构

```
apps/hub-server
├─ src
│  ├─ app.ts
│  ├─ env.ts
│
│  ├─ plugins
│  │   ├─ db.plugin.ts
│  │   ├─ auth.plugin.ts
│  │   ├─ ws.plugin.ts
│  │   ├─ static.plugin.ts
│  │   └─ error.plugin.ts
│
│  ├─ modules
│  │   ├─ announcement
│  │   ├─ docs
│  │   ├─ feedback
│  │   ├─ release
│  │   └─ dashboard
│
│  ├─ infra
│  │   ├─ sqlite
│  │   └─ filesystem
│
│  └─ utils
│
├─ migrations
└─ public
```

---

# 插件职责

## db.plugin.ts

负责：

- 初始化 SQLite 连接
- 提供 Repository 实例

## auth.plugin.ts

提供简单管理员认证（BasicAuth）。

## ws.plugin.ts

负责：

- WebSocket 连接管理
- 事件广播

## static.plugin.ts

用于提供静态资源：

- hub-web 前端页面
- 上传附件访问

## error.plugin.ts

统一处理 API 错误。

---

# 模块说明

## Feedback 模块

负责处理：

- 客户端反馈提交
- 附件上传
- 管理员处理流程

API：

```
POST /api/client/feedback
GET /api/admin/feedback
PATCH /api/admin/feedback/:id/status
```

---

## Announcement 模块

用于发布公告。

API：

```
GET /api/client/announcements
POST /api/admin/announcements
```

---

## Docs 模块

用于管理 Markdown 文档。

API：

```
GET /api/client/docs
GET /api/client/docs/:slug
```

---

## Release 模块

提供客户端版本检测能力。

API：

```
GET /api/client/releases/latest
POST /api/admin/releases
```

---

# WebSocket 通知

连接地址：

```
GET /ws
```

事件类型：

```
announcement.published
feedback.created
release.published
doc.updated
```

客户端收到事件后，再通过 HTTP 获取详细数据。

---

# 环境变量配置

示例：

```
PORT=8080
DATA_DIR=./data/hub
HUB_ADMIN_USERNAME=admin
HUB_ADMIN_PASSWORD=ngm123456
```

---

# 数据目录

```
data/hub
├─ hub.db
├─ docs
└─ uploads
```

---

# 总结

hub-server 是一个 **轻量、模块化的 Fastify 应用**，目标是保持代码结构清晰并易于维护。
