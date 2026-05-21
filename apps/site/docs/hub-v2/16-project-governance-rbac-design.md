# 16 项目治理与 RBAC 结合方案

## 1. 文档目标

本文档定义 Hub v2 中“项目治理模型”与“系统 RBAC 模型”的结合方式，明确：

1. 哪些权限属于平台级权限
2. 哪些权限属于项目内角色
3. 服务端如何做联合判定
4. 后续如何与组织/审批/报销域保持一致的授权思路

本文档是 `15-project-governance-rules.md` 的补充，不替代原有项目规则文档。

## 2. 结论先行

项目治理不应把 `owner/project_admin/member` 直接并入全局 `system_roles`。

正确分层是：

1. **系统 RBAC**  
   负责平台级、跨项目、跨组织的治理权限

2. **项目内角色**  
   负责单个项目里的治理边界

3. **项目可见性与归档规则**  
   继续作为独立约束层，先于或并行于角色权限判断

也就是：

- `RBAC = 平台级能力`
- `Project Role = 项目内角色`
- `Project Rule = visibility/status 规则`

服务端最终按三层联合判定。

## 3. 为什么不能直接合并

如果把 `owner/project_admin/member` 直接塞进 `system_roles`，会有几个问题：

1. `system_roles` 是全局角色，天然没有 `projectId` 维度
2. 同一个用户可能在 A 项目是 `owner`，在 B 项目只是 `member`
3. 项目角色本质是**资源内角色**，不是全局身份
4. 后续报销系统也会遇到相同问题：全局业务权限和单据/组织内关系必须分层

因此项目治理应继续保留 `project_members` 这套资源内角色模型。

## 4. 项目治理中的两类权限

## 4.1 平台级权限

平台级权限使用 `system_roles/system_permissions/user_system_roles` 表达。

它解决的问题是：

1. 谁可以创建项目
2. 谁可以查看全部项目
3. 谁可以管理任意项目
4. 谁可以归档项目
5. 谁可以配置项目治理规则

这类权限不依附某个具体项目。

## 4.2 项目内角色

项目内角色继续通过 `project_members` 表达。

建议保持三层：

1. `owner`
2. `project_admin`
3. `member`

它解决的问题是：

1. 谁能管理这个项目的成员
2. 谁能改这个项目的配置
3. 谁能维护模块/环境/版本
4. 谁在这个项目里只是普通参与者

## 5. 推荐授权模型

## 5.1 系统 RBAC 负责的平台级能力

建议最小化引入以下权限码：

### 项目平台权限

1. `project.manage`
   - 允许创建项目
   - 允许管理自己创建或负责的项目

2. `project.read.all`
   - 允许读取所有项目
   - 包括 private 项目
   - 不受项目成员关系约束

3. `project.manage.all`
   - 允许管理任意项目
   - 包括成员、模块、环境、版本、基础配置

4. `project.archive`
   - 允许切换项目 `active/inactive`

5. `project.governance.manage`
   - 允许维护项目治理规则、约束配置或项目级策略

6. `project.owner.transfer`
   - 如需把 owner 转移与一般维护权限分开，可单独配置

### 可选后续权限

1. `project.read.internal.all`
2. `project.read.private.all`
3. `project.member.assign.admin`
4. `project.member.remove`

第一阶段不必拆太细，先保证最小可用。

## 5.2 项目内角色继续负责的能力

### owner

建议能力：

1. 查看/编辑项目基础信息
2. 管理项目成员
3. 指定/取消 `project_admin`
4. 转移 `owner`
5. 管理模块、环境、版本

### project_admin

建议能力：

1. 查看/编辑项目基础信息
2. 管理普通成员
3. 管理模块、环境、版本
4. 不默认拥有 owner 转移能力

### member

建议能力：

1. 项目内读访问
2. 业务模块内按各模块规则读写
3. 不具备项目治理能力

## 6. 判定顺序

服务端建议统一按以下顺序判断：

1. **先判断项目是否存在**
2. **再判断项目状态是否允许该动作**
3. **再判断 visibility 是否允许访问**
4. **再判断平台级 RBAC 是否有覆盖权限**
5. **没有覆盖权限时，再判断项目内角色**

换句话说：

### 读操作

优先受：

1. 项目是否存在
2. `internal/private`
3. 平台全局读权限
4. 项目成员关系

### 写操作

优先受：

1. 项目是否归档
2. 平台全局管理权限
3. 项目内 `owner/project_admin`

## 7. 推荐服务端判断规则

以 `ProjectService` 为例，建议把现在散落的判断收口成统一模式。

## 7.1 创建项目

当前实现按 `project.manage` 判断是否允许创建项目。

建议规则：

1. 有 `project.manage` 权限的用户可创建
2. 创建后的具体维护动作继续受 owner/project_admin/project.manage.all 等规则约束

创建后：

1. 创建者自动成为该项目 `owner`
2. 同时在 `project_members` 中落 `isOwner = true`

## 7.2 读取项目

读取项目时建议判定：

1. 若有 `project.read.all`，直接允许
2. 否则按 `visibility` 和成员关系判断
3. `internal` 非成员可读
4. `private` 非成员不可读

## 7.3 维护项目

例如修改项目、管理成员、管理模块：

1. 若有 `project.manage.all`，直接允许
2. 否则要求是该项目 `owner` 或 `project_admin`

## 7.4 归档项目

建议单独判断：

1. 若有 `project.archive`，允许
2. 否则可限制为 `owner`
3. 不建议默认让所有 `project_admin` 都拥有归档能力，除非业务上明确需要

## 7.5 转移 owner

当前口径统一为“支持转移”。

建议规则：

1. 若有 `project.owner.transfer`，允许转移任意项目 owner
2. 否则仅当前项目 `owner` 可以转移
3. 普通 `project_admin` 不允许转移 owner

这样可以避免把最强治理动作误下放给所有项目管理员。

## 8. 与现有代码的映射建议

当前 `ProjectService` 已有一套接近成型的实现：

1. 创建项目时，创建者自动成为 owner
2. `requireProjectMaintainer()` 已经把 `owner/project_admin` 作为维护者
3. `assertCanTransferOwner()` 当前允许：
   - 具备 `project.owner.transfer` 的用户
   - 当前 owner

建议下一步不要再继续写死角色字面量判断，而是改造成统一入口：

1. `hasSystemPermission(ctx, 'project.manage.all')`
2. `hasSystemPermission(ctx, 'project.archive')`
3. `hasSystemPermission(ctx, 'project.owner.transfer')`

然后项目内角色继续走：

1. `repo.findMemberByProjectAndUserId(projectId, userId)`

## 9. 推荐的实现结构

建议新增一个统一的项目授权服务，例如：

`ProjectAuthorizationService`

职责：

1. 判断平台 RBAC 权限
2. 判断项目成员角色
3. 对外提供：
   - `canCreateProject`
   - `canReadProject`
   - `canManageProject`
   - `canArchiveProject`
   - `canTransferProjectOwner`

这样可以把 `ProjectService` 里的权限判断从业务逻辑中抽离出来。

## 10. 与报销域的统一思路

这个模型和后续报销系统是一致的：

### 项目域

1. 全局权限：`project.*`
2. 资源内关系：`owner/project_admin/member`

### 报销域

1. 全局权限：`expense.* / approval.* / finance.*`
2. 业务内关系：直属上级、部门负责人、财务审批责任人、审批模板阶段解析

统一模式是：

1. **全局权限解决跨资源覆盖**
2. **资源内关系解决具体对象上的职责边界**

这也是为什么项目角色不应该直接塞进全局 RBAC。

## 11. 落地顺序

建议按下面顺序推进：

1. 先补权限码：
   - `project.manage`
   - `project.read.all`
   - `project.manage.all`
   - `project.archive`
   - `project.owner.transfer`

2. 抽项目授权服务

3. 把 `ProjectService` 里的：
   - 基于 legacy 角色字段的硬编码判断
   - `owner/project_admin` 判断
   
   替换成统一授权入口

4. 最后再决定前端是否按 RBAC 隐藏某些按钮

## 12. 前端建议

前端显示建议保持保守：

1. “项目管理”入口对所有登录用户可见
2. 具体按钮按接口返回和权限判断控制
3. owner 转移、归档、成员提升这类高风险动作，前端可按能力字段显隐

不要只靠前端菜单隐藏做权限控制，服务端必须是最终约束点。

## 13. 最终结论

项目治理与 RBAC 的结合方式应当是：

1. **保留项目内角色**
   - `owner`
   - `project_admin`
   - `member`

2. **引入平台级项目权限**
   - `project.manage`
   - `project.read.all`
   - `project.manage.all`
   - `project.archive`
   - `project.owner.transfer`

3. **服务端按“平台级权限覆盖 + 项目内角色 + visibility/status 规则”联合判定**

这是当前 Hub v2 项目治理最稳定、可扩展、也最方便和后续报销授权模型统一的方案。
