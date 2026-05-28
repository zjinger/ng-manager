# Codex 指令：拆分 project.service.ts

请重构后端：

`apps/hub-v2/server/src/modules/project/project.service.ts`

当前问题：
- `project.service.ts` 代码过多，职责过宽。
- 同一个 service 同时承担项目基础信息、成员、模块、版本、环境、API Token、功能点、功能点分组、功能点进度汇总、进度 override、权限校验等逻辑。
- 功能点进度管理后续还要支持增量汇总返回，如果继续堆在 `project.service.ts`，会导致维护成本继续上升。

目标：
1. 将 `project.service.ts` 拆分为多个按业务子域划分的 service。
2. 保留现有 API 行为，不破坏 routes 调用。
3. 优先降低单文件复杂度，不做大规模数据库结构变更。
4. 功能点进度相关逻辑单独沉淀，为后续“增量汇总返回”做准备。
5. 不引入 NestJS、ORM、微服务或复杂依赖，继续保持当前 Fastify + TypeScript + better-sqlite3 风格。

---

## 一、推荐拆分目录

请在以下目录下拆分：

`apps/hub-v2/server/src/modules/project/`

建议结构：

```txt
project/
├── project.routes.ts
├── project.service.ts
├── project.types.ts
├── project.schemas.ts
│
├── services/
│   ├── project-base.service.ts
│   ├── project-member.service.ts
│   ├── project-meta.service.ts
│   ├── project-version.service.ts
│   ├── project-api-token.service.ts
│   ├── project-feature-point.service.ts
│   ├── project-feature-point-group.service.ts
│   ├── project-feature-progress.service.ts
│   ├── project-feature-progress-aggregate.service.ts
│   └── project-access.service.ts
│
└── repositories/
    ├── project.repository.ts
    ├── project-member.repository.ts
    ├── project-meta.repository.ts
    ├── project-feature-point.repository.ts
    ├── project-feature-point-group.repository.ts
    └── project-feature-progress.repository.ts
```

如果当前项目还没有 repository 层，可以先只拆 `services/`，repository 层作为第二阶段 TODO。

---

## 二、拆分原则

### 1. project.service.ts 保留为 Facade

不要让 routes 一次性大改。

保留：

```ts
export class ProjectService {
  constructor(...) {}

  listProjects(...) {
    return this.baseService.listProjects(...);
  }

  getProject(...) {
    return this.baseService.getProject(...);
  }

  listMembers(...) {
    return this.memberService.listMembers(...);
  }

  getFeatureProgress(...) {
    return this.featureProgressService.getFeatureProgress(...);
  }

  updateFeaturePointGroup(...) {
    return this.featurePointGroupService.updateFeaturePointGroup(...);
  }
}
```

也就是说：
- `project.routes.ts` 暂时仍然可以注入 `ProjectService`
- `ProjectService` 变成聚合门面 Facade
- 真实业务逻辑迁移到子 service
- 这样可以降低改动风险

目标：
- `project.service.ts` 最终控制在 200～300 行以内
- 不再包含大段 SQL、复杂聚合、进度计算、树构建

---

## 三、各 service 职责

### 1. project-base.service.ts

负责项目主表：
- listProjects
- getProject
- createProject
- updateProject
- archiveProject / removeProject
- project summary 映射
- 项目基础字段校验

不要处理：
- 成员
- 功能点
- 进度
- 版本
- 环境

### 2. project-member.service.ts

负责项目成员：
- listMembers
- listMemberCandidates
- addMember
- updateMember
- removeMember
- 判断项目负责人 / 项目管理员
- 成员展示字段聚合

权限判断可以调用 `ProjectAccessService`，不要自己重复写一套权限逻辑。

### 3. project-meta.service.ts

负责项目元数据：
- modules
- environments
- 其他 meta item

包括当前类似：
- listModules
- getModule
- addModule
- updateModule
- removeModule
- listEnvironments
- addEnvironment
- updateEnvironment
- removeEnvironment

如果当前 modules / environments 共用一张 meta 表，这个 service 负责按 type 分发。

### 4. project-version.service.ts

负责项目版本：
- listVersions
- addVersion
- updateVersion
- removeVersion

不要和模块、环境、功能点混在一起。

### 5. project-api-token.service.ts

负责项目 API Token：
- listApiTokens
- createApiToken
- revokeApiToken
- hash token
- token display prefix
- token 权限范围

不要和 project-base 混在一起。

### 6. project-feature-point.service.ts

负责功能点实体：
- listFeaturePoints
- addFeaturePoint
- updateFeaturePoint
- removeFeaturePoint
- 批量导入功能点时的 create
- 功能点字段校验
- ownerUserIds 处理
- moduleName / submoduleName 兼容处理

注意：
- 新增、编辑、删除功能点后，不要只返回 `ProjectFeaturePoint`。
- 应调用 `ProjectFeatureProgressAggregateService` 返回增量汇总结果。
- 如果本次不完整实现，至少预留 result contract。

### 7. project-feature-point-group.service.ts

负责功能点分组：
- addFeaturePointGroup
- updateFeaturePointGroup
- removeFeaturePointGroup
- module / submodule 层级维护
- manualProgress 更新
- sort / remark 更新
- 删除空分组校验

注意：
- updateFeaturePointGroup 当前已经返回进度增量结果，请继续保留。
- 该 service 不应该自己负责完整进度汇总计算，应调用 `ProjectFeatureProgressAggregateService`。

### 8. project-feature-progress.service.ts

负责进度业务入口：
- getFeatureProgress
- updateFeatureProgressSettings
- upsertFeatureProgressOverride
- removeFeatureProgressOverride
- 组合 settings / summary / modules / ungrouped
- 管理整体进度 override
- 管理模块进度 override

注意：
- 这个 service 是进度能力的应用层入口。
- 具体树汇总计算放到 `ProjectFeatureProgressAggregateService`。

### 9. project-feature-progress-aggregate.service.ts

这是本次最重要的拆分。

负责所有功能点进度汇总计算：
- 计算 summary
- 构建 ProjectFeatureProgressView
- 构建 modules tree
- 计算 module computedProgress
- 计算 module displayProgress
- 处理 manualProgress override 优先级
- 处理 project overall override
- 计算 sections patch
- 计算 affected ancestors
- 构建增量返回结果

建议暴露方法：

```ts
export class ProjectFeatureProgressAggregateService {
  buildView(projectId: string): ProjectFeatureProgressView {}

  buildIncrementalResult(
    projectId: string,
    options: ProjectFeatureProgressIncrementalOptions
  ): ProjectFeatureProgressIncrementalResult {}

  buildGroupUpdateResult(
    projectId: string,
    groupId: string
  ): ProjectFeaturePointGroupUpdateResult {}

  calculateSummary(...): ProjectFeatureProgressSummary {}

  buildModuleTree(...): ProjectFeatureProgressModuleNode[] {}

  buildSectionPatches(...): ProjectFeatureProgressSectionPatch[] {}
}
```

初期可以内部仍然全量计算，但接口要先统一。

后续再优化为真正 affected ancestors 局部计算。

### 10. project-access.service.ts

负责权限和访问控制：
- canManageProject
- canViewProject
- assertProjectManageAccess
- assertProjectReadAccess
- project.manage.all 判断
- 项目 owner / project_admin 判断
- 单用户默认兼容逻辑

不要让每个业务 service 自己重复写权限判断。

---

## 四、数据访问层建议

如果当前 SQL 全在 `project.service.ts` 中，建议逐步抽 repository。

第一阶段可以先抽这些：

### project-feature-point.repository.ts

负责：
- findByProjectId
- findById
- insert
- update
- delete
- listByGroupId
- listByModuleId
- countByGroupId
- ownerUserIds 读写辅助

### project-feature-point-group.repository.ts

负责：
- findGroupsByProjectId
- findById
- insert
- update
- delete
- listChildren
- countChildren
- countFeatures

### project-feature-progress.repository.ts

负责：
- getSettings
- saveSettings
- getOverrides
- upsertOverride
- removeOverride

如果一次拆 repository 成本过高，可以先不做，但要把 SQL 至少迁移到对应业务 service 中，不要继续堆在 `project.service.ts`。

---

## 五、事务边界

涉及写操作的 service 必须明确事务边界。

这些操作建议保持事务：
- createProject
- addMember / removeMember
- addFeaturePoint
- updateFeaturePoint
- removeFeaturePoint
- addFeaturePointGroup
- updateFeaturePointGroup
- removeFeaturePointGroup
- upsertFeatureProgressOverride
- removeFeatureProgressOverride
- updateFeatureProgressSettings

推荐模式：

```ts
const tx = this.db.transaction(() => {
  const entity = this.featurePointRepo.update(...);
  const result = this.progressAggregate.buildIncrementalResult(projectId, {
    affectedFeaturePointIds: [entity.id],
  });
  return result;
});

return tx();
```

注意：
- 写入和汇总结果构建应尽量在同一个事务里完成。
- 避免写入成功但返回汇总读取到旧数据。

---

## 六、增量汇总返回 Contract

请在后端 types 中新增或整理：

```ts
export interface ProjectFeatureProgressIncrementalResult {
  summary: ProjectFeatureProgressSummary;
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  affectedFeaturePoints?: ProjectFeaturePoint[];
  removedFeaturePointIds?: string[];
  affectedGroupIds?: string[];
  removedGroupIds?: string[];
  projectOverride?: ProjectFeatureProgressOverrideEntity | null;
}
```

然后尽量让以下接口返回该结构或其扩展：

### updateFeaturePoint

```ts
{
  featurePoint: ProjectFeaturePoint;
  affectedFeaturePoints: ProjectFeaturePoint[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

### removeFeaturePoint

```ts
{
  removedFeaturePointIds: string[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

### updateFeaturePointGroup

```ts
{
  group: ProjectFeaturePointGroup;
  nodes: ProjectFeatureProgressModuleNode[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

### removeFeaturePointGroup

```ts
{
  removedGroupIds: string[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

### upsertFeatureProgressOverride

```ts
{
  override: ProjectFeatureProgressOverrideEntity;
  projectOverride?: ProjectFeatureProgressOverrideEntity | null;
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

### removeFeatureProgressOverride

```ts
{
  removedOverride: {
    targetType: 'project' | 'module';
    targetId: string;
  };
  projectOverride?: ProjectFeatureProgressOverrideEntity | null;
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

---

## 七、拆分顺序

请不要一次性重写所有逻辑。按以下顺序迁移，确保每一步可编译：

### Step 1：抽 ProjectAccessService

- 先把权限判断、assert 方法迁出。
- `project.service.ts` 调用 accessService。
- 不改业务返回结构。

### Step 2：抽 ProjectFeatureProgressAggregateService

- 把功能点进度 summary、module tree、section patch、displayProgress、computedProgress 的计算迁出。
- getFeatureProgress 改为调用 aggregate service。
- updateFeaturePointGroup 的增量汇总也调用 aggregate service。

### Step 3：抽 ProjectFeaturePointGroupService

- 迁移 add/update/remove feature point group。
- 保持 routes 不变，通过 ProjectService facade 转发。

### Step 4：抽 ProjectFeaturePointService

- 迁移 add/update/remove feature point。
- 开始接入 ProjectFeatureProgressIncrementalResult。
- 减少前端保存后的 reload。

### Step 5：抽 ProjectFeatureProgressService

- 迁移 settings / overrides / getFeatureProgress。
- upsert/remove override 改成返回增量汇总结果。

### Step 6：抽 ProjectMemberService / ProjectMetaService / ProjectVersionService / ProjectApiTokenService

- 迁移剩余较独立的业务。
- `project.service.ts` 最终只保留 facade。

---

## 八、兼容要求

1. 不要一次性改动 `project.routes.ts` 的所有调用方式。
2. 如果 routes 当前依赖 `ProjectService`，请保留 `ProjectService` 方法签名。
3. 子 service 可以通过构造函数注入 db/logger/config 等现有依赖。
4. 不要改变数据库表结构。
5. 不要改变现有路由路径。
6. 不要删除现有类型，必要时新增兼容类型。
7. 不要引入 ORM。
8. 不要引入 NestJS。
9. 不要引入复杂 DI 容器。
10. 保持现有 Fastify 插件初始化方式。

---

## 九、验收标准

完成后请检查：

1. `project.service.ts` 显著变薄，目标 200～300 行。
2. 功能点进度汇总计算不再散落在 `project.service.ts`。
3. 功能点分组保存仍然能返回增量汇总结果。
4. `getFeatureProgress` 返回结构不变。
5. 现有项目列表、项目详情、成员、模块、环境、版本、API Token 功能不受影响。
6. 功能点新增、编辑、删除、分组更新、整体进度 override 功能正常。
7. TypeScript 编译通过。
8. 后端启动正常。
9. 前端 `ProjectApiService` 现有调用不被破坏。
10. 后续前端可以基于统一增量返回结果减少 reload。
