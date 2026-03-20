# apps/hub v2 重建设计方案与实施计划

最后更新：2026-03-19

## 1. 文档说明

本文档用于指导 `apps/hub` 的重做工作，目标是在 **保持现有技术选型不变** 的前提下，重新定义系统边界、模块结构、数据模型与实施路径，形成一套可逐步落地、可迁移、可维护的 v2 实施方案。

本文档定位为：

- `apps/hub-v2` 项目的总体实施设计文档
- 后续架构设计、数据库设计、接口设计与迭代计划的上位文档
- 团队重做期间的范围控制与决策基线

本文档当前为初稿，优先覆盖：

- 重做背景
- 目标与范围
- 总体架构
- 模块拆分
- 数据设计原则
- 实施阶段与迁移策略
- 风险与验收标准

---

## 2. 项目背景

### 2.1 当前系统现状

从现有 `apps/hub` 的代码和文档来看，系统已经从最初的轻量 Hub 服务演进为一个内部协作平台，当前实际能力包括：

- 管理员认证与个人资料
- 用户与项目管理
- 项目成员关系维护
- 公告、文档、发布信息
- 共享配置中心
- 文件上传
- Issue 管理与协作
- RD 管理与阶段推进
- Dashboard 聚合视图
- WebSocket 实时通知

现有实现能够支撑当前业务，但同时存在以下问题：

1. 系统定位与实现范围不一致  
   最初文档将其定义为轻量内容分发 Hub，但现有代码已明显演进为项目协作后台。

2. 服务端装配方式耦合度较高  
   多个模块在应用入口层集中装配，随着业务扩展，模块边界持续变弱。

3. 领域规则分散在服务实现中  
   Issue 与 RD 的状态流转、权限判断和事件触发已经具备复杂业务特征，但尚未沉淀为稳定的状态机与策略层。

4. 前端已形成复杂管理台形态，但缺少统一 Feature 分层  
   页面、状态、API 调用和全局上下文之间的职责边界不够清晰，后续扩展成本会上升。

5. 测试与工程约束仍偏薄弱  
   当前服务端自动化测试覆盖不足，重构或规则调整时的回归风险较高。

### 2.2 重做的必要性

继续在现有 `apps/hub` 上原地增量修补，会持续带来以下问题：

- 入口文件和核心服务继续膨胀
- 业务规则越来越难以验证
- 前后端模块边界继续模糊
- 后续迁移、权限细化和流程升级成本升高
- 系统认知成本增大，新成员接手难度上升

因此，本次工作不应被定义为“重构若干页面或模块”，而应定义为：

**在技术栈不变的前提下，重新设计并实施一套结构清晰、边界稳定、可分阶段迁移的 `apps/hub-v2`。**

---

## 3. 设计目标

### 3.1 总体目标

重做后的 Hub 应满足以下目标：

1. 明确系统定位  
   将系统正式定义为“内网协作平台单体应用”，而非仅是轻量内容 Hub。

2. 保持技术选型不变  
   继续使用：
   - 前端：Angular + ng-zorro-antd
   - 后端：Fastify + TypeScript
   - 数据：SQLite + better-sqlite3
   - 实时能力：WebSocket

3. 保持单体部署、低运维成本  
   不引入微服务拆分，不引入额外基础设施依赖。

4. 建立清晰模块边界  
   使业务域之间具备明确职责，降低跨模块侵入。

5. 强化流程型业务的稳定性  
   将 Issue、RD 等复杂模块沉淀为显式状态机和权限策略。

6. 支持渐进式迁移  
   新系统应允许按业务域分批实现与迁移，而非一次性切换。

7. 为后续扩展预留结构空间  
   包括通知中心、细粒度权限、客户端集成增强、统计分析等能力。

### 3.2 非目标

本次重做暂不以以下内容为目标：

- 微服务化拆分
- 多租户支持
- 复杂 RBAC 平台化
- 外部云服务依赖
- 高并发、大规模分布式扩展
- AI 自动化分析流程

---

## 4. 重做后的系统定位

### 4.1 系统定义

`apps/hub-v2` 定义为：

> 一个面向内部项目协作场景的单体应用，提供项目组织、内容分发、问题协作、研发流程管理和统一工作台能力。

### 4.2 系统边界

系统负责：

- 用户与项目协作关系维护
- 公告、文档、发布信息分发
- 项目配置统一管理
- 问题提报与处理协作
- 研发项推进与阶段管理
- Dashboard 聚合与通知提醒

系统不负责：

- 远程控制客户端执行任务
- 成为 ng-manager 的运行核心
- 复杂审批流引擎
- 企业级权限平台

### 4.3 架构原则

1. 单体优先，边界先行
2. 模块内闭环，模块间低耦合
3. 路由层只做入参解析和调用编排
4. Repo 只做持久化，不承载业务规则
5. 业务规则收敛到服务层和策略层
6. 聚合模块只读，不写核心业务
7. WS 仅负责事件通知，详情通过 HTTP 获取

---

## 5. 总体架构设计

### 5.1 逻辑分层

重做后的系统建议分为五层：

#### 1. 接入层

- HTTP API
- WebSocket 事件推送
- 前端静态资源托管

#### 2. 应用层

- 路由注册
- 请求参数校验
- 登录态识别
- 统一响应与错误处理

#### 3. 领域层

- Auth / User / Project
- Announcement / Document / Release
- Issue
- RD
- Dashboard

#### 4. 基础设施层

- SQLite
- 文件存储
- 上传能力
- 环境配置
- 日志

#### 5. 前端展示层

- Shell
- Feature 页面
- 状态管理
- API 调用与交互逻辑

### 5.2 部署形态

部署形态保持单体：

```text
Nginx（可选）
   ->
hub-server（Fastify）
   ->
SQLite / uploads / static web
```

Angular 构建产物由 Fastify 提供静态服务，保持部署简单。

---

## 6. 业务域拆分

### 6.1 基础域

基础域提供全系统共享能力，包括：

- Auth：登录、登出、改密、会话
- User：用户信息维护
- Project：项目管理
- Project Member：成员关系与项目访问范围
- Upload：上传与文件元数据
- Shared Config：共享配置中心

基础域是其他业务域的依赖前提，应优先完成。

### 6.2 内容域

内容域负责“信息分发型”业务，包括：

- Announcement：公告管理、发布、已读状态
- Document：文档管理、分类、发布
- Release：版本信息维护与客户端读取

内容域相对规则简单，适合作为新系统的第一批稳定业务域。

### 6.3 协作域

协作域负责问题协作流程，包括：

- Issue：问题单主体
- Issue Comment：评论与 @ 提醒
- Issue Attachment：附件关系
- Issue Participant：协作人
- Issue Log：行为日志

协作域是系统核心复杂业务域之一，必须基于显式状态机与权限策略设计。

### 6.4 研发域

研发域负责研发项推进流程，包括：

- RD Stage：阶段定义
- RD Item：研发项主体
- RD Log：操作日志

研发域与协作域关系密切，但应保持独立建模与独立流程，不直接混用实体。

### 6.5 聚合域

聚合域当前包括：

- Dashboard：我的待办、我的验证、我的研发项、公告摘要、文档摘要

聚合域只做读模型拼装，不反向写入协作域和研发域。

---

## 7. 服务端设计方案

### 7.1 目录结构建议

建议目录结构如下：

```text
apps/hub-v2/server/src
  app/
  shared/
  modules/
  db/migrations/
```

推荐模块结构：

```text
module/
  *.routes.ts
  *.schema.ts
  *.service.ts
  *.repo.ts
  *.types.ts
```

对于 Issue 与 RD，可增加：

- `*.policy.ts`
- `*-state-machine.ts`
- `*-event.service.ts`

### 7.2 分层职责

#### 路由层

负责：

- 接收请求
- 参数校验
- 调用 service
- 返回统一响应

不负责：

- 编写业务规则
- 直接操作数据库

#### Repo 层

负责：

- SQLite 查询与写入
- 事务边界支持
- 持久化结构映射

不负责：

- 状态流转
- 权限判断
- 事件触发

#### Service 层

负责：

- 核心业务规则
- 状态机驱动
- 权限判断
- 跨 repo 编排

#### Policy / State Machine 层

负责：

- 权限矩阵
- 状态迁移约束
- 流程合法性校验

### 7.3 服务装配原则

应用启动时按模块装配，但避免把所有具体依赖全部堆叠在一个入口文件中。建议通过 `build-container.ts` 统一创建模块依赖容器，再由 `create-app.ts` 注册插件与路由。

---

## 8. 前端设计方案

### 8.1 前端目标

前端继续基于 Angular + ng-zorro，但需从“页面堆叠式实现”升级为“Shell + Feature”结构。

### 8.2 前端层次

#### Shell

提供：

- 全局布局
- 顶栏
- 侧边导航
- 项目切换器
- 用户入口
- 通知入口

#### Core

提供：

- 登录态管理
- API 拦截器
- WS 客户端
- 路由守卫
- 项目上下文

#### Features

每个业务域独立成 feature，例如：

- dashboard
- announcements
- docs
- releases
- projects
- users
- issues
- rd
- feedback

每个 feature 内部拆分为：

- pages
- ui components
- api client
- types
- store / local state

### 8.3 前端约束

1. `AppComponent` 只保留全局壳与少量全局交互
2. 页面不直接拼装跨域逻辑
3. API 调用按 feature 拆分，不只依赖全局通用服务
4. 项目上下文作为单一状态源
5. Dashboard 只消费聚合接口，不自行拼业务数据

---

## 9. 数据模型设计原则

### 9.1 数据分层

建议将数据划分为以下类别：

#### 主数据

- users
- admin_accounts
- projects
- project_members

#### 内容数据

- announcements
- announcement_reads
- documents
- releases

#### 配置数据

- shared_configs

#### 协作流程数据

- issues
- issue_comments
- issue_attachments
- issue_participants
- issue_logs

#### 研发流程数据

- rd_stages
- rd_items
- rd_logs

#### 系统附属数据

- uploads
- dashboard_preferences

### 9.2 核心设计原则

1. 先定义流程，再定义表结构
2. 一类实体只归属于一个核心域
3. 派生视图尽量通过聚合生成，而不是冗余维护
4. 表结构优先支持业务稳定性，再追求灵活性
5. migration 必须按阶段增量演进

### 9.3 账号与业务身份分离

建议在 v2 中明确分离：

- `users`：业务用户身份
- `admin_accounts`：后台登录账号

这样可避免后续账号体系、成员体系和显示逻辑继续混杂。

---

## 10. 流程设计原则

### 10.1 Issue 流程

建议在 v2 中将 Issue 状态机显式化，典型状态如下：

```text
open
in_progress
resolved
verified
closed
reopened
```

状态迁移需由状态机统一控制，不允许分散在多个 service 条件判断中。

### 10.2 RD 流程

建议将 RD 状态机显式化，典型状态如下：

```text
todo
doing
blocked
done
accepted
closed
canceled
```

RD 的“进度变化”和“状态变化”需建立一致规则，避免页面和服务端分别推导。

### 10.3 权限模型原则

现阶段不引入复杂 RBAC，但需建立稳定的角色与动作约束：

- admin
- owner
- manager
- member
- tester
- viewer

对每个核心动作定义“谁可以做”，而不是在代码中临时判断。

---

## 11. 接口与事件设计原则

### 11.1 HTTP 接口原则

接口设计应统一资源风格，例如：

- `/api/admin/projects/:projectId/issues`
- `/api/admin/projects/:projectId/rd/items`

动作类接口保留为子动作，但应基于资源：

- `/assign`
- `/start`
- `/resolve`
- `/verify`
- `/reopen`
- `/close`

### 11.2 WebSocket 设计原则

WS 仅负责事件通知，不承载完整业务详情。

统一事件结构建议包含：

- type
- scope
- projectId
- entityType
- entityId
- action
- message
- createdAt
- actorId
- payload

### 11.3 通知原则

WS 事件应尽量只表达：

- 某条数据发生变化
- 哪个项目范围受影响
- 当前用户是否需要关注

详细信息由前端通过 HTTP 拉取。

---

## 12. 实施策略

### 12.1 实施总原则

本次重做采用 **双轨建设、逐步迁移** 的实施方式：

1. 保持现有 `apps/hub` 持续可运行
2. 新建 `apps/hub-v2`
3. 先完成基础骨架和基础域
4. 再按业务域逐步建设和迁移
5. 最后完成数据迁移与部署切换

### 12.2 阶段模板

从本章开始，所有实施阶段统一按以下模板定义：

- 目标
- 范围
- 不包含
- 前置依赖
- 输出物
- 数据库变更
- 测试清单
- 完成定义（DoD）
- 建议任务拆分

### 12.3 阶段 1：工程骨架与基础设施

#### 目标

建立 `apps/hub-v2` 的最小可运行骨架，使后续模块具备统一的运行、装配、错误处理、迁移和上下文机制。

#### 范围

- 初始化 `server` / `web` 目录
- 落地 `create-app.ts`、`build-container.ts`
- 落地 `RequestContext`
- 落地 `EventBus`
- 落地统一错误码与响应结构
- 落地 SQLite 初始化与 migration runner
- 落地 `health` API
- 打通最小 `auth` 登录闭环

#### 不包含

- 项目成员管理
- 内容域页面
- Issue / RD 主流程

#### 前置依赖

- 第 19 章模块 Contract 设计
- 第 20 章 RequestContext 设计
- 第 21 章 EventBus 设计

#### 输出物

- `apps/hub-v2/server` 基础脚手架
- `apps/hub-v2/web` 基础脚手架
- 最小运行时配置
- 最小登录页
- 可执行 migration 机制

#### 数据库变更

- `0001_base.sql`
- `users`
- `admin_accounts`
- 必要的系统基础表

#### 测试清单

- 服务启动测试
- `health` API 测试
- migration 执行测试
- 登录主流程测试
- `RequestContext` 构造测试

#### 完成定义（DoD）

- 服务端可启动
- migration 可执行
- 登录闭环可用
- `RequestContext` 已在主入口接入
- `EventBus` 已可发布和订阅
- 前端可进入受保护路由空壳

#### 建议任务拆分

- `INFRA-01` 初始化 `server` 脚手架
- `INFRA-02` 初始化 `web` 脚手架
- `INFRA-03` 实现 `RequestContext`
- `INFRA-04` 实现 `EventBus`
- `INFRA-05` 实现统一错误与响应
- `INFRA-06` 实现 migration runner
- `AUTH-01` 实现最小登录闭环
- `AUTH-02` 实现登录页与守卫

### 12.4 阶段 2：基础域

#### 目标

建立所有业务域依赖的基础主数据和访问范围控制能力。

#### 范围

- auth 完整化
- user
- project
- project-member
- upload

#### 不包含

- 公告、文档、发布管理
- Issue / RD 主流程

#### 前置依赖

- 阶段 1 完成
- `RequestContext` 已稳定
- Contract 规范已冻结

#### 输出物

- 用户与账号体系可用
- 项目列表与项目切换可用
- 项目访问范围可校验
- 上传能力可被后续模块复用

#### 数据库变更

- `0002_project_members.sql`
- `projects`
- `project_members`
- `uploads`

#### 测试清单

- 用户登录与改密测试
- 项目列表测试
- 项目成员范围测试
- 上传元数据测试

#### 完成定义（DoD）

- 登录后可以稳定获取当前用户和项目范围
- 非授权用户无法访问项目资源
- 上传能力可被其他模块调用
- 项目切换行为在前后端语义一致

#### 建议任务拆分

- `AUTH-03` 完善改密/登出/会话检查
- `USER-01` 定义 User Contract
- `USER-02` 实现用户查询与维护
- `PROJ-01` 定义 Project Contract
- `PROJ-02` 实现项目列表/详情
- `PROJ-03` 实现项目成员关系
- `UPLOAD-01` 定义 Upload Contract
- `UPLOAD-02` 实现上传与元数据
- `WEB-CTX-01` 实现前端项目上下文

### 12.5 阶段 3：内容域

#### 目标

优先在 v2 中落地规则相对稳定的内容分发型模块，为系统提供第一批可交付业务能力。

#### 范围

- announcement
- document
- release
- shared-config

#### 不包含

- Issue / RD
- Dashboard 个性化聚合

#### 前置依赖

- 阶段 2 完成
- 项目范围和上传能力可复用

#### 输出物

- 公告管理闭环
- 文档管理闭环
- 发布信息管理闭环
- 共享配置读取与管理闭环

#### 数据库变更

- `0003_content.sql`
- `announcements`
- `announcement_reads`
- `documents`
- `releases`
- `shared_configs`

#### 测试清单

- 公告发布和已读测试
- 文档创建/更新/发布测试
- 发布信息读取测试
- 共享配置按作用域读取测试

#### 完成定义（DoD）

- 内容域模块可独立演示
- 客户端读取接口可稳定返回
- 公告已读状态正确
- `shared-config` 作用域语义稳定

#### 建议任务拆分

- `ANN-01` 定义 Announcement Contract
- `ANN-02` 实现公告 CRUD 与发布
- `ANN-03` 实现公告已读
- `DOC-01` 定义 Document Contract
- `DOC-02` 实现文档 CRUD 与发布
- `REL-01` 定义 Release Contract
- `REL-02` 实现发布信息管理
- `CFG-01` 定义 Shared Config Contract
- `CFG-02` 实现全局/项目配置读取

### 12.6 阶段 4：协作域（Issue）

#### 目标

落地完整的问题协作主流程，使 v2 具备最核心的协作能力。

#### 范围

- Issue 主体
- Comment
- Attachment
- Participant
- Log
- Issue Event

#### 不包含

- RD
- Dashboard 聚合

#### 前置依赖

- 阶段 2 完成
- 阶段 3 推荐完成
- Issue 状态机和权限矩阵已冻结

#### 输出物

- Issue 创建、查看、编辑、指派、认领、开始、解决、验证、重开、关闭
- 评论与 @ 提醒
- 附件与协作人管理
- Issue 日志与事件

#### 数据库变更

- `0004_issue.sql`
- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_participants`
- `issue_logs`

#### 测试清单

- Issue 状态机测试
- Issue 权限策略测试
- Issue 主流程集成测试
- 评论/附件/参与人测试
- 事务一致性测试

#### 完成定义（DoD）

- 所有状态迁移通过统一状态机执行
- 所有权限判断通过统一 policy 执行
- 日志与事件不丢失
- 评论、附件、协作人流程可用
- 主流程具备集成测试覆盖

#### 建议任务拆分

- `ISSUE-01` 定义 Issue Contract
- `ISSUE-02` 定义 Issue 状态机
- `ISSUE-03` 定义 Issue Policy
- `ISSUE-04` 实现 Issue Repo
- `ISSUE-05` 实现 Issue Command Service
- `ISSUE-06` 实现 Issue Query Service
- `ISSUE-07` 实现 Comment 子模块
- `ISSUE-08` 实现 Attachment 子模块
- `ISSUE-09` 实现 Participant 子模块
- `ISSUE-10` 实现日志与事件
- `ISSUE-WEB-01` 实现 Issue 页面主链路

### 12.7 阶段 5：研发域（RD）

#### 目标

落地研发项和阶段推进流程，补齐项目协作的研发管理能力。

#### 范围

- RD Stage
- RD Item
- RD Log
- RD Event

#### 不包含

- Dashboard 聚合
- 通知中心高级能力

#### 前置依赖

- 阶段 2 完成
- RD 状态机和权限矩阵已冻结

#### 输出物

- 阶段管理
- RD 项管理
- 状态变更与进度变更
- 阻塞、完成、验收、关闭链路

#### 数据库变更

- `0005_rd.sql`
- `rd_stages`
- `rd_items`
- `rd_logs`

#### 测试清单

- RD 状态机测试
- RD 权限测试
- RD 主流程集成测试
- 进度与状态一致性测试

#### 完成定义（DoD）

- RD 状态流转通过统一状态机执行
- 进度与状态规则一致
- 阻塞/恢复/完成/验收流程稳定
- RD 日志和事件完整

#### 建议任务拆分

- `RD-01` 定义 RD Contract
- `RD-02` 定义 RD 状态机
- `RD-03` 定义 RD Policy
- `RD-04` 实现 Stage 管理
- `RD-05` 实现 RD Item Command Service
- `RD-06` 实现 RD Item Query Service
- `RD-07` 实现 RD 日志与事件
- `RD-WEB-01` 实现 RD 页面主链路

### 12.8 阶段 6：聚合域与通知

#### 目标

建立统一工作台入口和实时通知基础能力，但保持其只读聚合和事件消费属性。

#### 范围

- dashboard query
- ws subscriber
- 通知入口基础能力
- dashboard preferences

#### 不包含

- 二次审批流
- 复杂消息中心

#### 前置依赖

- 阶段 3、4、5 完成
- Dashboard Query 边界已冻结
- EventBus 可稳定工作

#### 输出物

- 首页聚合数据
- 我的待办、我的验证、我的研发项
- 通知入口
- Dashboard 卡片偏好

#### 数据库变更

- `0006_dashboard.sql`
- `dashboard_preferences`

#### 测试清单

- Dashboard Query 测试
- Dashboard 页面测试
- WS 订阅推送测试
- 偏好配置测试

#### 完成定义（DoD）

- Dashboard 不直接依赖业务 repo
- WS 只作为 EventBus 订阅者
- 聚合数据可稳定刷新
- 偏好配置可持久化

#### 建议任务拆分

- `DASH-01` 定义 Dashboard Query Contract
- `DASH-02` 实现 Dashboard Query
- `DASH-03` 实现 Dashboard Preferences
- `WS-01` 实现 WS Subscriber
- `WEB-DASH-01` 实现 Dashboard 页面
- `WEB-NOTIFY-01` 实现通知入口

### 12.9 阶段 7：迁移、回归与切换

#### 目标

完成从 v1 到 v2 的数据迁移、回归验证和部署切换。

#### 范围

- 数据迁移脚本
- 数据映射清单
- 回归测试
- 内部试运行
- 切换部署配置

#### 不包含

- 新业务范围扩张

#### 前置依赖

- 阶段 1 至 6 完成
- 数据模型已冻结
- API 和页面主流程已稳定

#### 输出物

- 可执行迁移脚本
- 迁移验证报告
- 切换清单
- 回滚方案

#### 数据库变更

- 迁移脚本不新增业务表，但会对目标表进行数据导入与校验

#### 测试清单

- 迁移演练
- 回归测试
- 部署验证
- 回滚演练

#### 完成定义（DoD）

- 数据迁移成功率可验证
- 回归测试通过
- 切换步骤清晰可执行
- 回滚方案经过演练

#### 建议任务拆分

- `MIG-01` 梳理 v1 -> v2 数据映射
- `MIG-02` 实现迁移脚本
- `MIG-03` 迁移演练
- `QA-01` 回归测试清单执行
- `OPS-01` 部署切换清单
- `OPS-02` 回滚演练

---

## 13. 数据迁移策略

### 13.1 迁移原则

1. 迁移顺序按业务复杂度递进
2. 优先迁移主数据和内容数据
3. Issue 和 RD 放在后期迁移
4. 迁移脚本必须可重复验证
5. 迁移过程中保留回滚方案

### 13.2 推荐迁移顺序

1. users / admin_accounts
2. projects / project_members
3. announcements / documents / releases / shared_configs
4. uploads
5. issues 及其附属表
6. rd 及其附属表
7. dashboard_preferences

### 13.3 切换原则

建议采用以下切换方式：

- 数据迁移验证完成后，先内部试运行
- 内容域优先切换
- 协作域与研发域在验证完成后切换
- 最后统一切换前端入口和部署配置

---

## 14. 测试与质量保障

### 14.1 测试重点

服务端优先覆盖：

- Auth 主流程
- Project 访问范围
- Issue 状态机
- Issue 权限策略
- RD 状态机
- Dashboard 聚合逻辑

前端优先覆盖：

- 登录页
- 项目切换
- Issue 关键交互
- Dashboard 关键路径

### 14.2 质量门槛

每个阶段至少满足：

- 能独立构建
- migration 可执行
- 核心路径可验证
- 不破坏既有 v1 运行

---

## 15. 风险与应对

### 15.1 主要风险

1. 需求边界持续扩张  
   风险：重做过程中再次把系统拉回“边做边扩”的状态。  
   应对：以本文档为范围基线，变更单独评估。

2. Issue / RD 规则不稳定  
   风险：流程设计尚未完全固化。  
   应对：先冻结状态机和权限矩阵，再编码。

3. 迁移成本低估  
   风险：旧数据结构与新结构存在差异。  
   应对：提前做映射清单与迁移演练。

4. 双轨期间维护压力上升  
   风险：v1 与 v2 并存增加临时成本。  
   应对：优先收敛 v1 的新需求，避免同时在两边扩张。

5. 测试覆盖不足  
   风险：切换时出现流程回归。  
   应对：优先保障服务端主流程测试。

---

## 16. 验收标准

`apps/hub-v2` 进入可切换状态，至少需满足以下标准：

1. 基础域完整可用
2. 内容域完整可用
3. Issue 主流程完整可用
4. RD 主流程完整可用
5. Dashboard 可稳定展示关键工作台信息
6. WebSocket 通知基础能力可用
7. 数据迁移脚本完成并验证通过
8. 新系统可独立构建、部署和运行

---

## 17. 后续文档拆分建议

本文档后续建议拆分出以下子文档：

1. `02-architecture-design.md`  
   描述模块图、分层设计、容器装配和前后端结构。

2. `03-database-design.md`  
   描述表结构、字段定义、索引、迁移计划和数据映射。

3. `04-api-design.md`  
   描述 HTTP API、错误码、分页协议和 WS 事件模型。

4. `05-implementation-roadmap.md`  
   描述实施阶段、周计划、里程碑和验收点。

---

## 18. 结论

`apps/hub` 的重做不应理解为简单的代码整理，而应视为一次正式的系统再设计工作。  
在技术选型保持不变的条件下，本次重做的核心是：

- 重新定义系统边界
- 建立清晰模块结构
- 固化流程规则
- 提供可分阶段实施与迁移的落地方案

`apps/hub-v2` 的目标不是推翻现有能力，而是在吸收现有业务沉淀的基础上，形成一套更稳定、更清晰、更适合持续演进的内网协作平台实现。


---

# 19. 模块 Contract 设计

## 19.1 设计目标

在 v2 中，模块之间的协作必须通过显式 Contract 完成，而不是直接依赖某个模块的具体 service 实现。

引入 Contract 层的目标包括：

- 限制跨模块耦合
- 明确每个模块的对外能力边界
- 支持测试时替换实现
- 支持后续 CLI、Job、SDK 等非 HTTP 入口复用同一套业务能力

## 19.2 目录约定

建议每个需要被其他模块调用的业务模块增加 `*.contract.ts`：

```text
modules/
  issue/
    issue.contract.ts
    issue.service.ts
    issue.repo.ts
```

推荐区分两类 Contract：

- Command Contract：处理写操作和业务动作
- Query Contract：处理聚合读取和只读查询

## 19.3 Contract 设计原则

1. 路由层依赖模块 Contract，不依赖 repo
2. Dashboard、WS、CLI、Job 只能依赖 Contract，不依赖具体 service 实现
3. Contract 暴露稳定的业务语义，不暴露持久化细节
4. Contract 入参应显式包含 `RequestContext`
5. Contract 应与实现解耦，便于 mock 和测试替换

## 19.4 推荐接口示例

```ts
export interface IssueCommandContract {
  create(input: CreateIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  assign(issueId: string, assigneeId: string, ctx: RequestContext): Promise<IssueEntity>;
  start(issueId: string, input: StartIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  resolve(issueId: string, input: ResolveIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  verify(issueId: string, input: VerifyIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  reopen(issueId: string, input: ReopenIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  close(issueId: string, input: CloseIssueInput, ctx: RequestContext): Promise<IssueEntity>;
}

export interface IssueQueryContract {
  getDetail(issueId: string, ctx: RequestContext): Promise<IssueDetailResult>;
  list(query: ListIssuesQuery, ctx: RequestContext): Promise<IssueListResult>;
}
```

```ts
export interface ProjectAccessContract {
  requireProjectAccess(projectId: string, ctx: RequestContext, action: string): Promise<void>;
  requireProjectMember(projectId: string, userId: string, action: string): Promise<ProjectMemberEntity>;
  listAccessibleProjectIds(ctx: RequestContext): Promise<string[]>;
}
```

## 19.5 依赖方向约束

推荐依赖方向：

```text
route -> contract -> service -> repo
dashboard query -> query contract
ws subscriber -> query contract / notification contract
```

禁止出现：

```text
dashboard -> issue.repo
announcement.service -> rd.repo
ws.manager -> issue.repo
```

---

# 20. RequestContext 统一上下文

## 20.1 设计目标

`RequestContext` 用于统一描述一次业务调用的执行上下文，避免 service 直接依赖 Fastify request 或前端页面语义。

它是 HTTP、WS、CLI、Job 四类入口共享的统一上下文模型。

## 20.2 推荐定义

```ts
export interface RequestContext {
  accountId: string;
  userId?: string | null;
  roles: string[];

  // 当前请求允许访问的项目范围
  projectIds?: string[];

  // 当前入口来源
  source: 'http' | 'ws' | 'cli' | 'job';

  // 观测与审计字段
  requestId?: string;
  ip?: string;
  userAgent?: string;
}
```

## 20.3 构造原则

不同入口构造 `RequestContext` 的规则：

- HTTP：由认证插件和路由上下文生成
- WS：由握手身份和订阅范围生成
- CLI：由本地账号配置或调用参数生成
- Job：由系统账号和任务调度器生成

## 20.4 使用约束

1. 所有 application / domain service 必须显式接收 `RequestContext`
2. repo 不得接收 `RequestContext`
3. policy 层可使用 `RequestContext`
4. 状态机 side effects 可读取 `RequestContext`
5. route 层负责把协议层对象映射为 `RequestContext`

## 20.5 设计收益

- 统一权限判断入口
- service 不再依赖 Fastify request
- CLI / WS / HTTP 共享一套业务服务
- 审计字段具备统一承载位置

---

# 21. 事件机制（EventBus）

## 21.1 设计目标

WebSocket 在 v2 中不应作为事件源，而应只是事件消费者之一。

建议引入轻量 `EventBus`，统一承接领域事件发布与订阅，解决以下问题：

- service 直接依赖 WS 的耦合
- 通知、日志、审计、读模型刷新缺少统一入口
- 后续新增 CLI、Job、监控订阅时难以复用

## 21.2 推荐结构

```text
shared/
  event/
    domain-event.ts
    event-bus.ts
    event-subscriber.ts
```

## 21.3 统一事件模型

```ts
export interface DomainEvent {
  type: string;
  scope: 'global' | 'project';
  projectId?: string;

  entityType: 'announcement' | 'document' | 'release' | 'issue' | 'rd' | 'system';
  entityId: string;
  action: string;

  actorId?: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}
```

## 21.4 推荐总线接口

```ts
export interface EventBus {
  emit(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: (event: DomainEvent) => Promise<void> | void): void;
}
```

## 21.5 发布与订阅原则

发布者：

- IssueCommandService
- RdCommandService
- AnnouncementService
- DocumentService
- ReleaseService

订阅者：

- WebSocket Push Subscriber
- Notification Subscriber
- Audit Subscriber
- Dashboard Projection Subscriber（如后续需要）

## 21.6 编码约束

1. service 只能发事件到 EventBus，不允许直接调用 WS push
2. 订阅者不得回写原始业务逻辑
3. 事件 payload 只放摘要信息，不放完整 entity
4. 业务事实以数据库为准，事件仅为副作用传播

---

# 22. 状态机（State Machine）落地设计

## 22.1 设计目标

Issue 与 RD 的状态机不能只停留在说明文档或 service 条件分支中，必须具备“可执行定义”。

状态机设计至少包含：

- 状态集合
- 动作集合
- 迁移表
- Guard
- Side Effects

## 22.2 Issue 状态机建议

### 状态

```text
open
in_progress
resolved
verified
closed
reopened
```

### 动作

```text
assign
claim
start
resolve
verify
reopen
close
comment
add_participant
remove_participant
attach
detach
```

### 迁移表示例

```ts
export const issueStateMachine = {
  open: {
    assign: 'open',
    claim: 'open',
    start: 'in_progress',
    close: 'closed'
  },
  in_progress: {
    resolve: 'resolved',
    reassign: 'in_progress',
    close: 'closed'
  },
  resolved: {
    verify: 'verified',
    reopen: 'reopened',
    close: 'closed'
  },
  verified: {
    reopen: 'reopened',
    close: 'closed'
  },
  reopened: {
    assign: 'reopened',
    start: 'in_progress',
    close: 'closed'
  },
  closed: {
    reopen: 'reopened'
  }
} as const;
```

## 22.3 RD 状态机建议

### 状态

```text
todo
doing
blocked
done
accepted
closed
canceled
```

### 动作

```text
start
block
resume
finish
accept
close
cancel
update_progress
comment
```

## 22.4 Guard 设计原则

所有状态迁移都必须经过统一入口，例如：

```ts
canTransition(from, action, ctx, entity)
```

Guard 应至少校验：

- 当前状态是否合法
- 当前用户角色是否合法
- 当前用户是否属于项目范围
- 当前动作的前置字段是否完整

## 22.5 Side Effects 设计原则

每次状态迁移都应显式定义副作用：

- 写日志
- 发领域事件
- 更新时间字段
- 清理或补齐关联字段

建议定义为：

```ts
type TransitionResult = {
  nextStatus: IssueStatus;
  effects: Array<'write_log' | 'emit_event' | 'touch_updated_at'>;
};
```

## 22.6 编码前冻结要求

在开始编码 Issue 和 RD 前，必须先冻结：

1. 状态集合
2. 动作集合
3. 迁移表
4. 角色动作矩阵
5. 副作用清单

---

# 23. Dashboard Query Layer 设计

## 23.1 设计目标

Dashboard 在 v2 中必须是只读聚合层，不能直接依赖多个写服务拼装业务逻辑。

因此建议引入专门的 Query Layer：

- 聚合读取从 Query Layer 进入
- 写逻辑仍由各业务模块 Command Service 负责

## 23.2 推荐结构

```text
modules/
  dashboard/
    dashboard.query.contract.ts
    dashboard.query.ts
    dashboard.routes.ts
```

## 23.3 推荐接口

```ts
export interface DashboardQueryContract {
  getHomeData(ctx: RequestContext): Promise<DashboardViewData>;
  getMyTodos(ctx: RequestContext): Promise<DashboardTodoItem[]>;
  getMyIssueStats(ctx: RequestContext): Promise<DashboardIssueStats>;
  getMyRdStats(ctx: RequestContext): Promise<DashboardRdStats>;
}
```

## 23.4 查询来源约束

Dashboard Query 可依赖：

- IssueQueryContract
- RdQueryContract
- AnnouncementQueryContract
- DocumentQueryContract
- ProjectAccessContract

Dashboard Query 不可依赖：

- issue.repo
- rd.repo
- announcement.service 的写接口

## 23.5 读模型原则

1. Dashboard 不承载状态迁移逻辑
2. Dashboard 不写业务表
3. Dashboard 使用聚合查询结果，不缓存业务事实
4. 如后续需要投影表，应通过 EventBus 维护，而不是由 Dashboard 反向写入

---

# 24. 第一阶段工程骨架

## 24.1 阶段目标

第一阶段不是“把目录搭出来”，而是建立后续所有模块共享的工程基础设施。

## 24.2 必须落地的基础件

- `create-app.ts`
- `build-container.ts`
- `register-plugins.ts`
- `register-routes.ts`
- `RequestContext` 定义与创建器
- `EventBus` 定义与内存实现
- `AppError` / `error-codes`
- `ok` / `fail` 响应结构
- `db` 初始化与 migration runner
- `health` API
- 最小 `auth` 闭环

## 24.3 第一阶段完成定义

第一阶段完成时，必须满足：

1. 服务端可启动
2. migration 可执行
3. health API 可用
4. 登录闭环可用
5. `RequestContext` 已接入
6. `EventBus` 已接入
7. container 装配方式可承载模块扩展

---

# 25. 关键工程约束

## 25.1 总体约束

1. Repo 不允许包含业务逻辑
2. Service / Query 是唯一业务入口
3. 状态机必须集中定义
4. WS 不允许由 service 直接调用
5. 跨模块调用必须走 Contract
6. 所有业务入口必须构造 `RequestContext`
7. Dashboard 不得依赖 repo
8. route 不允许直接拼装跨域业务逻辑

## 25.2 事务边界约束

对以下动作必须定义单事务边界：

- Issue 状态迁移
- Issue 创建 + 初始日志
- RD 状态迁移
- RD 创建 + 初始日志
- 上传元数据创建与关系绑定

事务内推荐只包含：

- 主实体更新
- 关联表更新
- 业务日志写入

事件发送推荐在事务成功后执行。

## 25.3 依赖约束

禁止：

- route -> repo
- dashboard -> repo
- service -> ws manager
- module A 直接访问 module B 内部 repo

允许：

- route -> contract
- service -> repo
- service -> policy
- service -> event bus
- query -> query contract

---

# 26. 结构优化建议

## 26.1 Upload 向通用资源模型演进

当前 `upload` 可先保留为独立模块，但在 v2 设计上建议预留向更通用 `resource` 模型演进的空间：

```ts
type Resource = {
  id: string;
  type: 'file' | 'image' | 'avatar' | 'attachment';
  ownerId?: string;
};
```

当前阶段不必直接重构为通用资源中心，但命名与表结构应避免阻断后续演进。

## 26.2 Shared Config 显式作用域

`shared-config` 建议在设计上显式支持：

```ts
scope: 'global' | 'project'
```

如后续需要，可扩展：

```ts
scope: 'global' | 'project' | 'user'
```

## 26.3 身份关系收紧

在编码前需要补清楚：

- `admin_accounts.user_id` 是否允许为空
- `users` 与 `project_members.user_id` 的唯一映射规则
- 登录显示名、业务显示名、项目成员显示名的优先级规则

否则权限与展示逻辑会再次混杂。

## 26.4 项目范围语义收紧

需要在编码前明确：

- `projectId` 是“当前操作项目”
- `projectIds` 是“当前可访问项目范围”

这两者在 `RequestContext`、Query、权限判断和 Dashboard 中必须分开使用。

---

# 27. 开发任务驱动规范

## 27.1 目标

本文档需要从“架构说明文档”进一步升级为“开发任务驱动文档”。

每个阶段都应能被拆成可直接进入任务系统的 Epic / Story / Task。

## 27.2 阶段模板

从下一版开始，建议每个阶段统一使用如下模板：

```text
阶段名称
- 目标
- 范围
- 不包含
- 前置依赖
- 输出物
- 接口契约
- 数据库变更
- 测试清单
- 完成定义（DoD）
- 风险
- 拆分任务
```

## 27.3 任务模板

推荐任务模板如下：

```text
Task ID:
标题:
所属阶段:
前置依赖:
输入:
输出:
修改范围:
测试要求:
完成定义:
```

## 27.4 推荐任务粒度

建议拆分粒度：

- 一个 Contract 定义是一个任务
- 一个 Query Service 是一个任务
- 一个状态机实现是一个任务
- 一个路由闭环是一个任务
- 一个 migration 文件是一个任务

避免把“完整 Issue 模块”作为单个开发任务。

## 27.5 编码前冻结清单

开始正式编码前，必须先冻结以下设计件：

1. 模块依赖方向图
2. `RequestContext` 结构
3. Contract 文件规范
4. Issue 状态机迁移表
5. RD 状态机迁移表
6. EventBus 事件结构
7. Dashboard Query 边界
8. 阶段 DoD 模板

---

# 28. 最终工程判断标准

当满足以下条件时，说明 v2 架构具备健康的工程基础：

- 模块可独立测试
- 无跨模块直接引用 repo
- 状态机集中定义且可单测
- Dashboard 不承载写逻辑
- service 不依赖 Fastify request
- WebSocket 只是事件消费者之一
- Contract 可以被 HTTP、WS、CLI 复用
- 阶段文档可以直接拆成开发任务
