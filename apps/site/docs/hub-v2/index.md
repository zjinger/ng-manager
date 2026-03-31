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
- [06 Web 架构设计文档](/hub-v2/06-web-architecture)：定义前端目录结构、Core/Shared/Features 分层、UI 组件边界、状态边界与前端实施顺序。
- [08 数据迁移映射清单](/hub-v2/08-migration-mapping)：定义 hub v1 到 hub-v2 的表级、字段级、状态级映射和切流建议。
- [09 迁移执行 Runbook](/hub-v2/09-migration-runbook)：定义迁移演练、上线当天执行顺序、校验清单、灰度切流与回滚规则。
- [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)：冻结 RD 状态流转与角色操作权限，直接用于开发与测试验收。
- [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)：冻结 Issue 状态流转与角色操作权限（含认领），直接用于开发与测试验收。
- [12 内网部署与迁移执行](/hub-v2/12-deploy-intranet)：定义 192.168.1.31 的发布步骤、v1->v2 迁移命令、验收和回滚。
- [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)：统一 Project Token 与 Personal Token、Issue 与 RD 的读取和写入流程、接口、权限与审计。
- [14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification)：统一 WS 事件类型、hints 刷新约定、Dashboard/通知/badge 的实时刷新矩阵。
- [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)：统一内部/私有可见性、活跃/归档边界、成员规则与项目显示范围偏好。

## 推荐阅读顺序

1. 先读 [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)，确认系统定位、目标与范围。
2. 再读 [02 架构设计文档](/hub-v2/02-architecture-design) 和 [03 数据库设计文档](/hub-v2/03-database-design)，冻结核心设计件。
3. 接着读 [04 API 设计文档](/hub-v2/04-api-design)，统一前后端接口语义。
4. 再读 [06 Web 架构设计文档](/hub-v2/06-web-architecture)，冻结前端目录、组件和状态边界。
5. 如果准备接现网，再读 [08 数据迁移映射清单](/hub-v2/08-migration-mapping)，冻结迁移口径。
6. 在准备演练和切流前，再读 [09 迁移执行 Runbook](/hub-v2/09-migration-runbook)，冻结执行顺序与回滚规则。
7. 如需 webapp 直连 Hub V2 数据并推进 Issue/RD 可操作化，再读 [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)。
8. 如需统一实时刷新链路，再读 [14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification)。
9. 如需统一项目治理规则，再读 [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)。
10. 最后按 [05 实施路线图](/hub-v2/05-implementation-roadmap) 拆任务并启动开发。

## 当前文档集覆盖范围

- 系统背景与目标
- 服务端与前端分层设计
- 模块 Contract 与统一上下文
- Issue / RD 状态机落地要求
- EventBus 与 WebSocket 的职责边界
- 数据库建模、索引与 migration 策略
- HTTP API 与 WS 事件规范
- 阶段推进方式与任务映射
- 前端目录结构与 UI 分层策略
- v1 -> v2 的数据迁移与切流口径
- 迁移演练、正式切流与回滚执行手册
- webapp 通过 Token 体系读取与写入 Hub V2 Issue/RD 的接入规范
- Personal Token 对关键写动作的鉴权与审计落地方案
- WS 实时事件模型、hints 刷新约定与 Dashboard 实时同步方案
- 项目内部/私有可见性、归档只读、成员角色与项目显示范围偏好规则

<!-- ## 后续扩展建议

后续新增 hub-v2 文档建议继续放在 `/hub-v2/` 目录下，并优先补充：

- `06-task-backlog.md`
- `07-state-machine-spec.md`
- `08-permission-matrix.md`
- `09-data-migration-mapping.md`
- `10-cutover-checklist.md` -->
