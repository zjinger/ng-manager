# 使用指南

面向 ng-manager 内部协作平台的 Hub V2 文档入口。本文档集覆盖重建设计、当前实现基线、迁移部署、权限治理、集成联调、发布运维和回归检查。

---

## 文档导读

### 总览与设计

- [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)：总实施文档，定义背景、目标、范围、阶段和验收标准。
- [02 架构设计文档](/hub-v2/02-architecture-design)：定义分层、模块依赖、Contract、RequestContext、EventBus、状态机与 Query Layer。
- [03 数据库设计文档](/hub-v2/03-database-design)：定义核心表结构、索引、迁移拆分和当前 migration 演进基线。
- [04 API 设计文档](/hub-v2/04-api-design)：定义 HTTP 资源路径、统一响应、错误码、分页、DTO、WS 事件模型和当前已注册模块摘要。
- [05 实施路线图](/hub-v2/05-implementation-roadmap)：把设计文档收束成阶段、Epic、Story、Task 和执行顺序。
- [06 Web 架构设计文档](/hub-v2/06-web-architecture)：定义前端目录结构、Core/Shared/Features 分层、UI 组件边界、状态边界和当前一级路由事实。

### 迁移与部署

- [08 数据迁移映射清单](/hub-v2/08-migration-mapping)：定义 hub v1 到 Hub V2 的表级、字段级、状态级映射和切流建议。
- [09 迁移执行 Runbook](/hub-v2/09-migration-runbook)：定义迁移演练、上线当天执行顺序、校验清单、灰度切流与回滚规则。
- [12 内网部署与迁移执行](/hub-v2/12-deploy-intranet)：定义 192.168.1.31 的发布步骤、v1 -> v2 迁移命令、验收和回滚。

### 权限与治理

- [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)：冻结 RD 状态流转与角色操作权限，直接用于开发与测试验收。
- [11 RD 产品需求](/hub-v2/11-rd-product-requirements)：定义研发管理模块的产品需求、协作规则、进度机制和验收口径。
- [11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)：冻结 Issue 状态流转与角色操作权限（含认领），直接用于开发与测试验收。
- [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)：统一内部/私有可见性、活跃/归档边界、成员规则与项目显示范围偏好。
- [16 项目治理与 RBAC 结合方案](/hub-v2/16-project-governance-rbac-design)：说明系统 RBAC 与项目内角色的分工、判定顺序和落地边界。
- [16 全局错误码规范](/hub-v2/16-error-code-governance)：统一服务端错误码注册、抛错约束、全局错误处理与前端错误拦截映射。
- [20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)：跟踪 `users`、`admin_accounts`、`user_system_roles` 的权限来源收口和回归检查。

### 集成与实时

- [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)：统一 Project Token 与 Personal Token、Issue 与 RD 的读取和写入流程、接口、权限与审计。
- [14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification)：统一 WS 事件类型、hints 刷新约定、Dashboard/通知/badge 的实时刷新矩阵。
- [18 通知机制](/hub-v2/18-notification-mechanism)：统一通知入库、收件人推导、去重、已读同步、Bell 状态和用户切换隔离规则。

### 运维与发布

- [17 发布流程规范](/hub-v2/17-release-process)：统一版本号管理、升级说明生成、changelog 维护、部署与回滚流程。
- [19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)：统一文件上传落库、bucket/category 语义、Issue 附件删除状态策略与 temp/issues 孤儿清理口径。

## 推荐阅读顺序

1. 先读 [01 实施文档](/hub-v2/01-hub-redesign-implementation-plan)，确认系统定位、目标与范围。
2. 再读 [02 架构设计文档](/hub-v2/02-architecture-design)、[03 数据库设计文档](/hub-v2/03-database-design)、[04 API 设计文档](/hub-v2/04-api-design)，冻结核心技术口径。
3. 前端实现前读 [06 Web 架构设计文档](/hub-v2/06-web-architecture)，确认目录、路由、组件和状态边界。
4. 研发 Issue/RD 能力时读 [10 RD 权限矩阵](/hub-v2/10-rd-permission-matrix)、[11 RD 产品需求](/hub-v2/11-rd-product-requirements)、[11 Issue 权限矩阵](/hub-v2/11-issue-permission-matrix)。
5. 做项目治理、系统权限或错误处理时读 [15 项目规则与流转说明](/hub-v2/15-project-governance-rules)、[16 项目治理与 RBAC 结合方案](/hub-v2/16-project-governance-rbac-design)、[16 全局错误码规范](/hub-v2/16-error-code-governance)、[20 RBAC 收口迁移清单](/hub-v2/20-rbac-convergence-checklist)。
6. 如需 webapp 直连 Hub V2 数据并推进 Issue/RD 可操作化，读 [13 Token 体系与 webapp 读写接入方案](/hub-v2/13-api-token-integration)。
7. 如需统一实时刷新、通知入库和 Bell 计数，读 [14 WS 实时通知机制](/hub-v2/14-ws-realtime-notification) 与 [18 通知机制](/hub-v2/18-notification-mechanism)。
8. 准备接现网时读 [08 数据迁移映射清单](/hub-v2/08-migration-mapping)、[09 迁移执行 Runbook](/hub-v2/09-migration-runbook)、[12 内网部署与迁移执行](/hub-v2/12-deploy-intranet)。
9. 准备上线和日常运维时读 [17 发布流程规范](/hub-v2/17-release-process) 与 [19 上传生命周期与清理策略](/hub-v2/19-upload-lifecycle-and-cleanup)。
10. 最后按 [05 实施路线图](/hub-v2/05-implementation-roadmap) 拆任务并启动开发。

## 当前实现补充

早期 01-06 文档以重建设计为主，后续代码已经扩展出更多实际模块。阅读时以当前 `apps/hub-v2` 实现为准：

- 服务端已注册组织架构、系统 RBAC、系统设置、系统职务、审计日志、审批模板、报销、问卷、搜索、公开报表、AI/AI 报表等模块。
- 数据库 migration 已推进到 `0052_admin_audit_logs.sql`，后续设计判断应基于当前 migration 序列，而不是只看初始核心表设计。
- Web 一级路由已覆盖 `dashboard`、`issues`、`rd`、`content`、`projects`、`profile`、`notifications`、`reimbursements`、`admin`，`feedbacks` 和 `surveys` 受 feature flag 控制。
- 系统 RBAC 与项目内角色并存：平台级入口和系统管理能力优先看权限码，项目内数据访问继续结合项目成员关系与项目角色。

## 当前文档集覆盖范围

- 系统背景与目标
- 服务端与前端分层设计
- 模块 Contract 与统一上下文
- Issue / RD 状态机落地要求
- EventBus、WebSocket 与通知入库职责边界
- 数据库建模、索引、migration 演进与 v1 -> v2 迁移
- HTTP API、Token API、Personal Token 与 WS 事件规范
- 前端目录结构、UI 分层、一级路由和状态边界
- 项目治理、系统 RBAC、项目角色、错误码和权限收口
- 迁移演练、正式切流、内网部署、发布、回滚与上传清理策略
