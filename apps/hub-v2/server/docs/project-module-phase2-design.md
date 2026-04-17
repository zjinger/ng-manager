# 项目管理子项目/模块 Phase 2 设计方案

## 1. 目标

基于现有 `project_modules` 能力，补齐设计稿中的模块详情交互（成员/依赖/统计），并保持与当前 `Issue/RD` 的 `module_code` 关联兼容。

范围：

1. 模块详情基础信息（负责人、状态、优先级、图标、进度）。
2. 模块成员（项目成员继承 + 模块专属成员）。
3. 模块统计（Issue/RD 数量与分布）。

不在本期：

1. Issue/RD 从 `module_code` 全量迁移到 `module_id`。
2. 模块级复杂权限体系（仅沿用项目维护者权限）。
3. 模块依赖（前置依赖/后置影响）。

## 2. 现状约束

1. `Issue/RD` 主要通过 `module_code` 关联模块，不是 `module_id`。
2. `project_modules` 已支持 `node_type/subsystem-parent/project_no`。
3. 项目成员与 owner/admin 权限体系已存在，可直接复用。

## 3. 数据模型变更

## 3.1 扩展 `project_modules`

建议新增字段：

1. `owner_user_id TEXT NULL`：模块负责人（关联 `users.id`）。
2. `icon_code TEXT NULL`：模块图标编码（如 `shield`,`table`,`branch`）。
3. `priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low'))`。
4. `status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','released','paused'))`。
5. `progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)`：手动值，后续可切换自动计算覆盖。

索引：

1. `idx_project_modules_owner_user_id(owner_user_id)`
2. `idx_project_modules_status(status)`

## 3.2 新增模块专属成员表

`project_module_members`

1. `id TEXT PRIMARY KEY`
2. `project_id TEXT NOT NULL`
3. `module_id TEXT NOT NULL`
4. `user_id TEXT NOT NULL`
5. `role_code TEXT NOT NULL DEFAULT 'member'`（先沿用 `member|project_admin|product|ui|frontend_dev|backend_dev|qa|ops`）
6. `created_at TEXT NOT NULL`
7. `updated_at TEXT NOT NULL`
8. `UNIQUE(module_id, user_id)`
9. `FOREIGN KEY (module_id) REFERENCES project_modules(id) ON DELETE CASCADE`
10. `FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`

## 3.3 兼容性规则

1. 保留 `project_modules.code` 作为与 Issue/RD 的关联键。
2. 为 `project_modules` 增加唯一约束：`UNIQUE(project_id, code)`（仅对 `code IS NOT NULL` 生效，可用 partial index）。
3. 模块重命名不影响统计；若变更 `code`，需提示“将影响 Issue/RD 关联统计”。

## 4. 后端接口设计

路径前缀均为 `/api/admin/projects/:projectId/modules`。

## 4.1 模块详情

1. `GET /:moduleId`
2. 返回：基础字段 + owner 信息 + 统计摘要（可先简版）

## 4.2 模块基础信息更新

1. `PATCH /:moduleId`
2. 新增可更新字段：`ownerUserId/iconCode/priority/status/progress`

## 4.3 模块成员

1. `GET /:moduleId/members`
2. `POST /:moduleId/members`（添加专属成员）
3. `DELETE /:moduleId/members/:memberId`
4. 返回结构中区分：
   1. `source: 'project' | 'module'`
   2. `isInherited: boolean`

## 4.4 模块统计

1. `GET /:moduleId/stats`
2. 输出建议：
   1. `issueTotal/issueDone/issueDoing/issueTodo`
   2. `rdTotal/rdDone/rdDoing/rdTodo`
   3. `recentActivities[]`（先取最近 N 条 issue/rd 变更）

实现建议：

1. 统计先按 `module_code = project_modules.code` 聚合。
2. 后续若引入 `module_id`，可双写并逐步切换。

## 5. 权限策略

读权限：

1. 项目成员可读模块详情/统计。

写权限：

1. 项目负责人或项目管理员可修改模块基础信息、成员、依赖。
2. 全局 admin 保持可操作。

## 6. 前端改造（对齐设计稿）

基于 Phase 1 已有 `project-module-manage-dialog`，新增 `project-module-detail-dialog`：

1. 基本信息 Tab：`code(只读)、name、description、icon、priority、owner、status、progress`
2. 成员 Tab：展示“继承成员 + 模块专属成员”，支持增删专属成员
3. 统计 Tab：Issue/RD 数字卡 + 状态分布 + 最近活动

入口：

1. 模块管理弹窗中点击模块行进入详情弹窗。

## 7. 分阶段实施

1. Phase 2A（建议 1 个迭代）
   1. DB migration（字段 + 两张新表）
   2. 基础信息接口 + 成员接口
   3. 前端详情弹窗：基本信息/成员 Tab
2. Phase 2B（建议 1 个迭代）
   1. 统计接口与统计 Tab
3. Phase 2C（后续）
   1. 依赖接口 + 防循环校验

## 8. 验收清单

1. 项目管理员可在独立弹窗创建/编辑子项目和模块。
2. 可在详情页设置模块负责人、状态、优先级、进度。
3. 成员 Tab 可增删模块专属成员，继承成员不可删除。
4. 统计 Tab 可看到对应模块的 Issue/RD 数据。
5. 现有 Issue/RD 不迁移数据时，统计仍正确（按 `module_code`）。
