# ngm-hub MVP 设计文档

最后更新：2026-03-06

## 概述

`ngm-hub` 是一个 **可选的内网服务**，用于增强 ng-manager 生态系统的能力。

它为 ng-manager 客户端提供共享信息服务，例如：

- 公告中心
- 文档中心
- 反馈收集
- 版本发布信息
- WebSocket 实时通知

需要强调：

**Hub 不能破坏 ng-manager 的 Local-first 原则。**

即使 Hub 不可用，CLI / Desktop 客户端也必须能够正常运行。

---

# 设计原则

1. 保持 Local-first 架构
2. Hub 必须是可选组件
3. Hub 主要负责 **信息分发与反馈收集**
4. Hub 不负责控制客户端执行任务
5. Hub 设计保持简单、稳定、易维护

---

# MVP 功能范围

## 包含功能

- 反馈中心（Feedback Center）
- 公告中心（Announcement Center）
- 文档中心（Docs Center）
- 版本信息中心（Release Metadata）
- WebSocket 通知机制
- 简易管理后台

## 暂不包含（未来扩展）

- 共享密码或凭据管理
- 远程执行客户端命令
- 复杂 RBAC 权限系统
- 多租户架构
- AI 自动分析反馈

---

# 系统架构

```
ngm-cli / ngm-desktop
        │
        │ HTTP + WebSocket（可选）
        ▼
      ngm-hub
        │
        ├─ hub-server (Fastify)
        └─ hub-web (Angular)
```

---

# 数据存储

Hub 采用混合存储策略：

结构化数据：

- SQLite 数据库

非结构化数据：

- Markdown 文档
- 上传文件（反馈附件等）

推荐目录结构：

```
data/hub
  hub.db
  docs/
  uploads/
```

---

# 核心模块

## Feedback

用于收集用户提交的 Bug 报告和功能建议。

## Announcements

用于向客户端发布系统公告。

## Docs

内部文档中心，使用 Markdown 管理。

## Releases

用于客户端版本检测。

## WebSocket

用于向客户端推送通知事件。

---

# 客户端集成方式

客户端可以配置 Hub 地址，例如：

```
hub:
  url: http://hub.internal:8080
```

连接 Hub 后可获得以下能力：

- 查看系统公告
- 检查版本更新
- 提交反馈
- 接收实时通知

---

# 版本规划

## v0.1

- Feedback 模块
- 基础 Dashboard
- 简单鉴权
- WebSocket 基础能力

## v0.2

- 公告系统
- 文档中心
- 版本发布信息

## v0.3

- 客户端深度集成
- Dashboard 统计增强
- 知识库扩展

---

# 总结

ngm-hub 的目标是：

**保持简单、稳定、可选。**

它用于增强 ng-manager 的协作能力，而不是成为系统核心控制中心。
