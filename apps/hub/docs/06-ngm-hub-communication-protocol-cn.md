# ngm-hub 通信协议规范

最后更新：2026-03-06

## 概述

本规范定义以下组件之间的通信：

- ngm-cli
- ngm-desktop
- ngm-hub

通信协议：

| 协议 | 用途 |
|---|---|
| HTTP | 数据查询与提交 |
| WebSocket | 实时事件通知 |

---

# HTTP API

客户端访问接口统一前缀：

```
/api/client
```

---

## 公告接口

```
GET /api/client/announcements
GET /api/client/announcements/:id
```

示例：

```json
[
  {
    "id":"ann-1",
    "title":"新版本发布",
    "summary":"ng-manager 0.3.0 已发布"
  }
]
```

---

## 文档接口

```
GET /api/client/docs
GET /api/client/docs/:slug
```

---

## 版本检查

```
GET /api/client/releases/latest?channel=desktop
GET /api/client/releases/latest?channel=cli
```

示例：

```json
{
  "version":"0.3.0",
  "title":"重大更新",
  "downloadUrl":"https://downloads/ngm-0.3.0.exe"
}
```

---

## 反馈提交

```
POST /api/client/feedback
```

请求示例：

```json
{
  "type":"bug",
  "title":"CLI 启动失败",
  "content":"运行 ngm ui 时出现错误"
}
```

响应：

```json
{
  "id":"fb-102"
}
```

---

# WebSocket 协议

连接地址：

```
/ws
```

---

# 事件类型

```
announcement.published
feedback.created
feedback.updated
release.published
doc.updated
```

---

# 事件格式

```json
{
  "type":"release.published",
  "version":"0.3.0",
  "channel":"desktop"
}
```

---

# 客户端行为建议

| 事件 | 客户端动作 |
|---|---|
| release.published | 提示更新 |
| announcement.published | 显示公告 |
| doc.updated | 刷新缓存 |

---

# 设计原则

1. WebSocket 只推送事件
2. 客户端通过 HTTP 获取详细数据
3. Hub 故障不能影响客户端运行
4. 协议保持向后兼容

---

# 总结

通信协议保证 ngm-hub **保持可选且低耦合**，符合 ng-manager 的 Local-first 架构。
