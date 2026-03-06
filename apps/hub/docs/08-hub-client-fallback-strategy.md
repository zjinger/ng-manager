# hub-client 降级策略设计

最后更新：2026-03-06

## 设计目标

ngm-hub 是 **可选组件**，因此客户端必须具备降级能力。

原则：

- Hub 不可用时客户端仍可运行
- 所有 Hub 功能都应是增强能力
- 失败应静默处理或友好提示

---

# Hub 连接状态

客户端维护三种状态：

| 状态 | 说明 |
|---|---|
| connected | Hub 可用 |
| degraded | Hub 响应慢 |
| offline | Hub 不可用 |

---

# API 调用降级策略

推荐策略：

1. 设置请求超时（3~5 秒）
2. 失败后自动重试一次
3. 若仍失败则进入 offline 状态

示例逻辑：

```
try:
  call hub api
except:
  retry once
  if failed:
    mark hub offline
```

---

# 功能降级

| 功能 | Hub 不可用时 |
|---|---|
| 公告 | 不显示 |
| 更新检测 | 跳过 |
| 反馈提交 | 本地缓存 |
| WS通知 | 不连接 |

---

# 本地缓存策略

建议缓存：

```
~/.ngm/cache/hub/
├─ announcements.json
├─ releases.json
```

Hub 不可用时读取缓存。

---

# 反馈缓存策略

如果提交失败：

```
~/.ngm/pending-feedback/
```

客户端可稍后重新提交。

---

# UI 提示策略

建议提示：

```
Hub 连接失败，部分功能不可用
```
但不要影响主流程。

---

# 总结

Hub 降级策略确保：

**ng-manager 始终保持 Local-first。**
