# 15 项目规则与流转说明

## 1. 文档目标

本文档定义 Hub v2 中“项目”相关的统一规则，覆盖：

- 项目可见性（内部 / 私有）
- 项目状态（活跃 / 归档）的行为边界
- 项目成员与项目管理员边界
- 个人项目显示范围偏好

本文档作为项目治理的执行口径，前后端实现和测试验收均以此为准。

## 2. 项目模型

### 2.1 可见性（visibility）

- `internal`：内部项目
- `private`：私有项目

### 2.2 状态（status）

- `active`：活跃
- `inactive`：归档

## 3. 可见性规则

### 3.1 internal

- 对项目成员：可读写（受模块权限约束）
- 对非项目成员：默认可读（列表、查看类动作），不可写

### 3.2 private

- 仅项目成员可访问
- 非成员不可读不可写

## 4. 归档规则（inactive）

归档项目统一进入“只读态”。

### 4.1 项目选择器

- 默认不展示归档项目（仅展示 `status=active` 项目）
- 若当前选中项目被归档，刷新后自动切换到第一个可见活跃项目

### 4.2 写操作限制

当项目为 `inactive` 时：

- 禁止 Issue、RD、内容中心（公告/文档/版本）等新增、编辑、状态流转、发布/归档等写操作
- 服务端统一返回 `PROJECT_INACTIVE`（HTTP 400）

### 4.3 读操作

- 归档项目允许读取（按可见性与成员关系判断）
- 历史记录、详情、列表查询可保留访问

## 5. 成员与角色规则

### 5.1 角色定义

- `owner`：项目创建者，唯一且不可变更
- `project_admin`：项目管理员，可管理成员与项目配置
- `member`：普通成员

### 5.2 成员管理约束

- `owner` 不可删除
- 成员可被提升为 `project_admin`
- 不支持转移 `owner`

## 6. 个人项目显示范围偏好

个人中心支持“项目显示范围”设置：

- `all_accessible`：显示所有可访问项目
- `member_only`：仅显示我参与的项目

说明：

- 该偏好只影响项目选择器和默认项目列表展示范围
- 不改变服务端权限模型本身

## 7. 权限矩阵（项目维度）

| 场景 | internal 成员 | internal 非成员 | private 成员 | private 非成员 |
|---|---|---|---|---|
| 读（list/get/view） | 允许 | 允许 | 允许 | 拒绝 |
| 写（create/update/delete/transition/publish/archive）且项目 active | 允许（按模块权限） | 拒绝 | 允许（按模块权限） | 拒绝 |
| 任意写操作且项目 inactive | 拒绝 | 拒绝 | 拒绝 | 拒绝 |

## 8. 接口约定（摘要）

- `GET /api/admin/projects`
  - 支持 `status=active|inactive`
  - 支持 `scope=all_accessible|member_only`
- `PATCH /api/admin/projects/:projectId`
  - `status` 可切换 `active/inactive`
- `GET /api/admin/profile/preferences`
- `PATCH /api/admin/profile/preferences`
  - 包含 `projectScopeMode`

## 9. 研发与测试检查项

- 归档项目在项目选择器不可见
- 归档项目写操作统一返回 `PROJECT_INACTIVE`
- internal/private 读写规则与矩阵一致
- `projectScopeMode` 切换后项目列表即时刷新
- owner 不可删除、不可转移

