<!-- ---
layout: home

hero:
  name: "NGM Hub v2"
  text: "方案与实施文档"
  tagline: 面向 ng-manager 内部协作平台的 v2 重建设计，覆盖实施方案、架构、数据库、API 与实施路线图。
  actions:
    - theme: brand
      text: 阅读实施总文档
      link: /hub-v2/01-hub-redesign-implementation-plan
    - theme: alt
      text: 查看架构设计
      link: /hub-v2/02-architecture-design 


features:
  - title: 以重做实施为核心
    details: 从系统定位、模块边界、迁移策略到阶段目标，先把“为什么重做、重做到什么程度”讲清楚。
  - title: 直接服务工程落地
    details: 文档不是停留在概念层，而是继续收束到 Contract、RequestContext、状态机、EventBus、Query Layer 和任务驱动实施。
---  -->
# 使用指南

面向 ng-manager 内部协作平台的 v2 重建设计，覆盖实施方案、架构、数据库、API 与实施路线图。

---

## 文档导读

- [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)：总实施文档，定义背景、目标、范围、阶段和验收标准。
- [02 架构设计文档](/hub-v2/02-architecture-design)：定义分层、模块依赖、Contract、RequestContext、EventBus、状态机与 Query Layer。
- [03 数据库设计文档](/hub-v2/03-database-design)：定义核心表结构、索引、迁移拆分和 v1 到 v2 的数据映射原则。
- [04 API 设计文档](/hub-v2/04-api-design)：定义 HTTP 资源路径、统一响应、错误码、分页、DTO 和 WebSocket 事件模型。
- [05 实施路线图](/hub-v2/05-implementation-roadmap)：把设计文档收束成阶段、Epic、Story、Task 和执行顺序。

## 推荐阅读顺序

1. 先读 [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)，确认系统定位、目标与范围。
2. 再读 [02 架构设计文档](/hub-v2/02-architecture-design) 和 [03 数据库设计文档](/hub-v2/03-database-design)，冻结核心设计件。
3. 接着读 [04 API 设计文档](/hub-v2/04-api-design)，统一前后端接口语义。
4. 最后按 [05 实施路线图](/hub-v2/05-implementation-roadmap) 拆任务并启动开发。

## 当前文档集覆盖范围

- 系统背景与目标
- 服务端与前端分层设计
- 模块 Contract 与统一上下文
- Issue / RD 状态机落地要求
- EventBus 与 WebSocket 的职责边界
- 数据库建模、索引与 migration 策略
- HTTP API 与 WS 事件规范
- 阶段推进方式与任务映射

<!-- ## 后续扩展建议

后续新增 hub-v2 文档建议继续放在 `/hub-v2/` 目录下，并优先补充：

- `06-task-backlog.md`
- `07-state-machine-spec.md`
- `08-permission-matrix.md`
- `09-data-migration-mapping.md`
- `10-cutover-checklist.md` -->
