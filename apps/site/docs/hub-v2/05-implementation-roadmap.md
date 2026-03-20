# apps/hub-v2 实施路线图

最后更新：2026-03-20

## 1. 文档目的

本文档用于把 `apps/hub-v2` 的重做方案转化为可执行的实施路线图，重点解决：

- 如何分阶段推进
- 每个阶段依赖什么、产出什么
- 哪些设计必须先冻结
- 如何从阶段拆到 Epic / Story / Task
- 如何定义每一阶段的完成标准

本文件是以下文档的执行层补充：

1. [01-hub-redesign-implementation-plan.md](d:/ng-manager/apps/hub-v2/docs/01-hub-redesign-implementation-plan.md)
2. [02-architecture-design.md](d:/ng-manager/apps/hub-v2/docs/02-architecture-design.md)
3. [03-database-design.md](d:/ng-manager/apps/hub-v2/docs/03-database-design.md)
4. [04-api-design.md](d:/ng-manager/apps/hub-v2/docs/04-api-design.md)

---

## 2. 路线图目标

路线图设计遵循以下目标：

1. 每个阶段都能独立评估完成度
2. 每个阶段都能映射到具体任务系统
3. 编码工作必须建立在冻结设计之上
4. 先完成基础设施和稳定域，再进入复杂流程域
5. 支持双轨迁移，避免一次性切换风险

---

## 3. 整体推进节奏

推荐推进顺序：

```text
阶段 0 设计冻结
阶段 1 工程骨架与基础设施
阶段 2 基础域
阶段 3 内容域
阶段 4 协作域（Issue）
阶段 5 研发域（RD）
阶段 6 聚合域与通知
阶段 7 迁移、回归与切换
```

整体原则：

- 先地基，再主流程，再聚合，再切换
- 不在阶段中途引入未冻结的新范围
- 每阶段结束必须有可演示输出

---

## 4. 阶段 0：设计冻结

### 4.1 目标

在正式编码前，冻结关键架构件、数据库件和 API 件，避免实现阶段重新发散。

### 4.2 必须冻结的设计项

架构：

- 模块依赖方向图
- Contract 文件规范
- `RequestContext` 定义
- EventBus 事件模型
- Dashboard Query 边界

流程：

- Issue 状态集合、动作集合、迁移表、Guard、Side Effects
- RD 状态集合、动作集合、迁移表、Guard、Side Effects
- 角色动作矩阵

数据库：

- 主数据表结构
- `admin_accounts.user_id` 语义
- `project_members.role_code` 枚举
- `issues.verifier_id` 是否引入
- `shared_configs.scope` 枚举
- migration 拆分顺序

API：

- 统一响应结构
- 错误码集合
- 分页结构
- Issue 动作接口集合
- RD 动作接口集合
- WS 事件枚举

### 4.3 输出物

- 冻结版文档评审结论
- 待实现模块清单
- 第一阶段任务拆分

### 4.4 完成定义（DoD）

- 冻结项全部有文档落点
- 关键争议项已有结论
- 阶段 1 任务可直接分配

### 4.5 建议任务

- `ARCH-REVIEW-01` 架构文档评审
- `DB-REVIEW-01` 数据库文档评审
- `API-REVIEW-01` API 文档评审
- `FLOW-REVIEW-01` 状态机与权限矩阵冻结

---

## 5. 阶段 1：工程骨架与基础设施

### 5.1 目标

建立所有模块共享的运行骨架。

### 5.2 范围

- `apps/hub-v2/server` 初始化
- `apps/hub-v2/web` 初始化
- 环境配置
- SQLite 初始化
- migration runner
- 统一错误码与响应
- `RequestContext`
- `EventBus`
- 最小登录闭环
- 前端路由守卫空壳

### 5.3 前置依赖

- 阶段 0 完成

### 5.4 输出物

- 可运行的 server/web 工程
- 可执行 migration
- `health` API
- 登录页和受保护路由壳

### 5.5 验收点

- 本地能独立启动
- 数据库初始化成功
- 登录可以进入空 Dashboard
- `RequestContext` 可在服务层使用
- `EventBus` 可发布和订阅

### 5.6 建议 Epic / Story

`EPIC-INFRA`

- `STORY-INFRA-SERVER-BOOTSTRAP`
- `STORY-INFRA-WEB-BOOTSTRAP`
- `STORY-INFRA-CONTEXT-EVENT`
- `STORY-INFRA-AUTH-MINIMAL`

### 5.7 建议任务

- `INFRA-01` 初始化 server 目录与构建脚本
- `INFRA-02` 初始化 web 目录与 Angular 脚手架
- `INFRA-03` 实现 env schema 与加载
- `INFRA-04` 实现 sqlite 与 migration runner
- `INFRA-05` 实现统一错误响应
- `INFRA-06` 实现 `RequestContext`
- `INFRA-07` 实现 `EventBus`
- `AUTH-01` 实现登录 challenge / login / me
- `WEB-01` 实现登录页与守卫

---

## 6. 阶段 2：基础域

### 6.1 目标

落地用户、项目、项目成员和上传能力，建立所有业务域的权限和范围基础。

### 6.2 范围

- auth 完整化
- user
- project
- project-members
- upload
- 前端项目上下文

### 6.3 前置依赖

- 阶段 1 完成

### 6.4 输出物

- 用户与账号闭环
- 项目列表和项目切换
- 项目成员关系维护
- 上传能力可复用

### 6.5 验收点

- 登录后可以读取当前账号信息
- 可以列出可访问项目
- 前端项目切换可用
- 未授权用户不能访问目标项目
- 上传模块可被 Issue / Profile 复用

### 6.6 建议 Epic / Story

`EPIC-FOUNDATION`

- `STORY-AUTH-FULL`
- `STORY-USER-MANAGEMENT`
- `STORY-PROJECT-MANAGEMENT`
- `STORY-PROJECT-MEMBERS`
- `STORY-UPLOAD`

### 6.7 建议任务

- `AUTH-02` 改密与登出
- `AUTH-03` 会话检查与 profile
- `USER-01` 定义 user contract
- `USER-02` 实现 user repo/service/routes
- `PROJ-01` 定义 project contract
- `PROJ-02` 实现项目 CRUD
- `PROJ-03` 实现项目成员管理
- `UPLOAD-01` 定义 upload contract
- `UPLOAD-02` 实现文件上传与访问
- `WEB-CTX-01` 实现项目上下文 store

---

## 7. 阶段 3：内容域

### 7.1 目标

先在 v2 中交付规则相对稳定的内容管理模块，尽早形成可演示业务能力。

### 7.2 范围

- announcements
- documents
- releases
- shared-configs

### 7.3 前置依赖

- 阶段 2 完成

### 7.4 输出物

- 公告管理
- 文档管理
- 发布信息管理
- 配置读取与管理

### 7.5 验收点

- 公告可创建、发布、已读
- 文档可创建、编辑、发布
- 版本信息可维护和读取
- 共享配置可按全局/项目返回

### 7.6 建议 Epic / Story

`EPIC-CONTENT`

- `STORY-ANNOUNCEMENTS`
- `STORY-DOCUMENTS`
- `STORY-RELEASES`
- `STORY-SHARED-CONFIG`

### 7.7 建议任务

- `ANN-01` announcement contract
- `ANN-02` announcement repo/service/routes
- `ANN-03` announcement read-state
- `DOC-01` document contract
- `DOC-02` document repo/service/routes
- `REL-01` release contract
- `REL-02` release repo/service/routes
- `CFG-01` shared-config contract
- `CFG-02` shared-config repo/service/routes
- `WEB-CONTENT-01` 内容域管理页面

---

## 8. 阶段 4：协作域（Issue）

### 8.1 目标

交付完整的问题协作主流程。

### 8.2 范围

- issue
- issue comments
- issue attachments
- issue participants
- issue logs
- issue domain events

### 8.3 前置依赖

- 阶段 2 完成
- Issue 状态机和权限矩阵冻结

### 8.4 输出物

- Issue 主流程可用
- 评论、附件、参与人闭环
- 事件与日志链路可用

### 8.5 验收点

- 所有写动作经过状态机
- 所有权限走 policy
- 评论与附件流程稳定
- 主流程具备集成测试

### 8.6 建议 Epic / Story

`EPIC-ISSUE`

- `STORY-ISSUE-STATE-MACHINE`
- `STORY-ISSUE-COMMANDS`
- `STORY-ISSUE-QUERIES`
- `STORY-ISSUE-COMMENTS`
- `STORY-ISSUE-ATTACHMENTS`
- `STORY-ISSUE-PARTICIPANTS`
- `STORY-ISSUE-WEB`

### 8.7 建议任务

- `ISSUE-01` issue contract
- `ISSUE-02` issue state machine
- `ISSUE-03` issue policy
- `ISSUE-04` issue repo
- `ISSUE-05` issue command service
- `ISSUE-06` issue query service
- `ISSUE-07` issue comments
- `ISSUE-08` issue attachments
- `ISSUE-09` issue participants
- `ISSUE-10` issue logs + events
- `WEB-ISSUE-01` issue list page
- `WEB-ISSUE-02` issue detail page
- `WEB-ISSUE-03` issue create/edit page

---

## 9. 阶段 5：研发域（RD）

### 9.1 目标

交付研发项和阶段推进流程。

### 9.2 范围

- rd stages
- rd items
- rd logs
- rd events

### 9.3 前置依赖

- 阶段 2 完成
- RD 状态机和权限矩阵冻结

### 9.4 输出物

- 阶段管理
- RD 项管理
- 阻塞、恢复、完成、验收流程

### 9.5 验收点

- 进度与状态规则一致
- RD 主流程具备集成测试
- 阶段变更和日志链路稳定

### 9.6 建议 Epic / Story

`EPIC-RD`

- `STORY-RD-STATE-MACHINE`
- `STORY-RD-STAGES`
- `STORY-RD-COMMANDS`
- `STORY-RD-QUERIES`
- `STORY-RD-WEB`

### 9.7 建议任务

- `RD-01` rd contract
- `RD-02` rd state machine
- `RD-03` rd policy
- `RD-04` rd stage management
- `RD-05` rd command service
- `RD-06` rd query service
- `RD-07` rd logs + events
- `WEB-RD-01` rd board/list page
- `WEB-RD-02` rd detail page
- `WEB-RD-03` rd stage manager

---

## 10. 阶段 6：聚合域与通知

### 10.1 目标

建立统一工作台入口和实时通知消费能力。

### 10.2 范围

- dashboard query
- dashboard preferences
- ws subscriber
- 通知入口基础能力

### 10.3 前置依赖

- 阶段 3、4、5 完成
- Dashboard Query 边界冻结
- EventBus 已稳定

### 10.4 输出物

- Dashboard 首页
- 我的待办 / 我的验证 / 我的研发项
- 通知入口
- 偏好配置

### 10.5 验收点

- Dashboard 不直接依赖 repo
- WS 只是 EventBus 订阅者
- 偏好配置可持久化
- 页面刷新与事件刷新都能正常工作

### 10.6 建议 Epic / Story

`EPIC-DASHBOARD`

- `STORY-DASHBOARD-QUERY`
- `STORY-DASHBOARD-PREFERENCES`
- `STORY-WS-SUBSCRIBER`
- `STORY-NOTIFICATION-ENTRY`

### 10.7 建议任务

- `DASH-01` dashboard query contract
- `DASH-02` dashboard query service
- `DASH-03` dashboard preferences repo/service
- `WS-01` ws subscriber
- `WEB-DASH-01` dashboard page
- `WEB-NOTIFY-01` notification inbox entry

---

## 11. 阶段 7：迁移、回归与切换

### 11.1 目标

完成从 v1 到 v2 的实际迁移和切换。

### 11.2 范围

- schema migration 校验
- data migration
- 回归测试
- 内部试运行
- 部署切换
- 回滚演练

### 11.3 前置依赖

- 阶段 1 至 6 完成
- v2 主流程稳定

### 11.4 输出物

- 数据映射清单
- 迁移脚本
- 迁移验证报告
- 部署切换清单
- 回滚方案

### 11.5 验收点

- 数据迁移成功率可验证
- 回归测试通过
- 切换步骤清晰
- 回滚可演练

### 11.6 建议 Epic / Story

`EPIC-MIGRATION`

- `STORY-DATA-MAPPING`
- `STORY-DATA-MIGRATION`
- `STORY-REGRESSION`
- `STORY-CUTOVER`

### 11.7 建议任务

- `MIG-01` 梳理 v1 -> v2 字段映射
- `MIG-02` 编写数据迁移脚本
- `MIG-03` 迁移演练
- `QA-01` 主流程回归测试
- `OPS-01` 部署切换清单
- `OPS-02` 回滚演练

---

## 12. 任务系统映射建议

### 12.1 层级建议

推荐使用三级结构：

- Epic：按阶段或业务域
- Story：按能力闭环
- Task：按单个可交付实现

### 12.2 建议示例

```text
EPIC-ISSUE
  STORY-ISSUE-COMMANDS
    TASK-ISSUE-01 issue contract
    TASK-ISSUE-02 issue state machine
    TASK-ISSUE-03 issue policy
    TASK-ISSUE-04 issue command service
```

### 12.3 Task 模板

```text
Task ID:
标题:
所属 Epic:
所属 Story:
前置依赖:
输入:
输出:
影响模块:
数据库变更:
测试要求:
完成定义:
```

---

## 13. 风险控制策略

### 13.1 主要风险

1. 设计未冻结就开始编码
2. 阶段中途新增范围
3. Dashboard 反向侵入业务逻辑
4. 状态机未收敛导致 service 重新膨胀
5. v1 / v2 双轨维护成本上升

### 13.2 控制措施

1. 阶段 0 结束前不进入正式开发
2. 每阶段只允许处理本阶段范围
3. 每阶段结束必须做一次 DoD 检查
4. 状态机、Contract、Context 变更必须评审
5. 切换前必须做迁移演练和回滚演练

---

## 14. 里程碑建议

建议设置以下里程碑：

- `M1`：基础骨架完成
- `M2`：基础域完成
- `M3`：内容域完成
- `M4`：Issue 完成
- `M5`：RD 完成
- `M6`：Dashboard 与通知完成
- `M7`：迁移与切换完成

每个里程碑至少具备：

- 文档冻结
- 功能演示
- 测试结果
- 风险清单

---

## 15. 路线图验收标准

路线图进入可执行状态，至少满足以下条件：

1. 每阶段范围明确
2. 每阶段依赖明确
3. 每阶段输出物明确
4. 每阶段 DoD 明确
5. 可以直接映射到任务系统

---

## 16. 下一步建议

当前文档体系已经覆盖：

- 实施总文档
- 架构设计
- 数据库设计
- API 设计
- 实施路线图

下一步建议按以下顺序继续推进：

1. 根据本路线图建立实际任务清单
2. 先完成阶段 0 设计冻结评审
3. 开始阶段 1 骨架实现
