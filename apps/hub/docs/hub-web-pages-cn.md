# ngm-hub Web 管理界面设计

## 技术选型

推荐：

- Angular
- ng-zorro-antd

原因：

- 与 ng-manager UI 技术栈统一
- 组件成熟
- 开发效率高

---

# 应用布局

```
+--------------------------------------------------+
| Header                                           |
+----------------------+---------------------------+
| Sidebar              | Content Area              |
|                      |                           |
| Dashboard            | 页面内容                  |
| Announcements        |                           |
| Docs                 |                           |
| Feedback             |                           |
| Releases             |                           |
+----------------------+---------------------------+
```

---

# 页面结构

## Dashboard

用于展示系统概览。

组件：

- 反馈总数
- 未处理反馈数
- 最新版本
- 最近公告
- 最近反馈

---

## Announcements

用于管理公告。

列表字段：

- 标题
- 状态
- 发布时间
- 更新时间

编辑字段：

- 标题
- 摘要
- Markdown 正文
- 状态
- 是否置顶

---

## Docs

管理文档中心。

列表字段：

- slug
- 标题
- 状态
- 更新时间

编辑字段：

- slug
- 标题
- 摘要
- Markdown 内容
- 状态

Markdown 文件存储在服务器文件系统。

---

## Feedback

用于管理用户反馈。

列表字段：

- ID
- 类型
- 标题
- 状态
- 来源（CLI / Desktop）
- 项目名称
- 创建时间

筛选条件：

- 状态
- 类型
- 来源
- 关键词

反馈详情页展示：

- 反馈内容
- 客户端环境信息
- 附件
- 管理员备注

---

## Releases

用于管理客户端版本信息。

列表字段：

- 渠道（CLI / Desktop）
- 版本号
- 状态
- 发布时间

编辑字段：

- 渠道
- 版本号
- 标题
- 更新说明
- 下载地址
- 状态

客户端使用 API：

```
GET /api/client/releases/latest
```

---

# 页面路由

```
/dashboard
/announcements
/docs
/feedback
/releases
```

---

# WebSocket 集成

管理后台可以连接 WebSocket，用于实时更新：

- 新反馈通知
- 新公告通知
- 新版本发布通知

---

# 总结

hub-web 是一个 **轻量管理后台**，主要用于维护 ngm-hub 的内容数据，而不是复杂的企业级管理系统。
