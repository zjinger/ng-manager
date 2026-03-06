# ngm-hub WebSocket 事件规范

最后更新：2026-03-06

## 概述

WebSocket 用于向客户端推送实时事件。

原则：

- WS 只发送事件
- 数据通过 HTTP 获取
- 客户端决定是否处理

---

# WebSocket 连接

地址：

```
/ws
```

客户端连接示例：

```javascript
const ws = new WebSocket("ws://hub.internal/ws")
```

---

# 事件模型

统一结构：

```json
{
  "type":"event.type",
  "timestamp":"2026-03-06T10:00:00Z",
  "data":{}
}
```

---

# 事件类型

## 公告发布

```
announcement.published
```

示例：

```json
{
 "type":"announcement.published",
 "data":{
   "id":"ann-101",
   "title":"新版本发布"
 }
}
```

---

## 新反馈

```
feedback.created
```

---

## 反馈状态更新

```
feedback.updated
```

---

## 文档更新

```
doc.updated
```

---

## 新版本发布

```
release.published
```

示例：

```json
{
 "type":"release.published",
 "data":{
   "version":"0.4.0",
   "channel":"desktop"
 }
}
```

---

# 客户端行为建议

| 事件 | 建议动作 |
|---|---|
| announcement.published | 弹出公告 |
| release.published | 提示更新 |
| feedback.created | 管理后台刷新 |
| doc.updated | 清理缓存 |

---

# 心跳机制

推荐每 30 秒发送 ping。

客户端响应 pong。

---

# 重连策略

断线后：

```
1s -> 3s -> 5s -> 10s
```

指数退避。

---

# 总结

WebSocket 事件系统用于：

**实时通知，而不是业务数据传输。**
