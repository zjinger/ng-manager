# Codex 指令：功能点进度管理页面与后端增量汇总优化

请继续优化 apps/hub-v2 的“功能点进度管理”页面及对应后端增量汇总能力。

本次重点路径：

前端：

```txt
apps/hub-v2/web/src/app/features/projects/pages/project-feature-progress-page/project-feature-progress-page.component.ts
apps/hub-v2/web/src/app/features/projects/components/project-feature-progress-tree/
apps/hub-v2/web/src/app/features/projects/services/project-api.service.ts
apps/hub-v2/web/src/app/features/projects/models/project.model.ts
```

后端：

```txt
apps/hub-v2/server/src/modules/project
```

当前现状：

1. `project-feature-progress-page.component.ts` 已经超过 1000 行，组件过重。
2. 当前页面已经拆出 stats / toolbar / tree / drawer 等组件，但页面容器仍然承担了大量状态、树构建、搜索过滤、导入、批量标题编辑、Drawer 保存、patch 合并逻辑。
3. `visibleNodes` / 展开后的功能点数量可能超过 300 条，树展开收起、Drawer 保存后页面仍有卡顿风险。
4. 后端已经开始做模块/子模块进度保存后的增量汇总返回，例如 `updateFeaturePointGroup` 返回 `ProjectFeaturePointGroupUpdateResult`，前端当前通过 `applyFeaturePointGroupUpdateResult` 局部 patch `groupProgressPatches` / `sectionProgressPatches` / `summaryPatch`。
5. 但功能点新增、编辑、删除、整体进度保存、清除整体进度、状态配置更新、标题批量编辑等流程仍大量使用 `reload()`，导致整棵树重新加载。

目标：

1. 前端页面瘦身，将 `project-feature-progress-page.component.ts` 控制到 300 行左右。
2. 前端树列表升级为扁平化 `visibleNodes` + CDK Virtual Scroll。
3. 前端保存后尽量使用后端增量汇总结果做局部 patch，减少 `reload()`。
4. 后端统一增量汇总返回结构，不只服务模块进度保存，也服务功能点新增、编辑、删除、整体进度 override、清除 override 等操作。
5. 不改变当前页面定位：仍是项目负责人维护功能点进度台账的 MVP 管理页，不新增导入导出能力，不做领导汇报页。

---

## 一、前端重构要求

### 1. 保留页面容器，但只做协调

重构：

```txt
apps/hub-v2/web/src/app/features/projects/pages/project-feature-progress-page/project-feature-progress-page.component.ts
```

页面容器只保留：

- `projectId` / `subtitle` / `canManage`
- `load` / `reload`
- 打开和关闭 Drawer
- 接收子组件事件
- 调用 state service
- 提示 message
- 少量页面级 signal

请将以下逻辑迁出页面组件：

- `buildFeatureTree`
- `collectModuleFeatures`
- `collectModuleNodes`
- `sortFeatures`
- `featureSearchEntries`
- `featureProgressStatusByFeatureId`
- `moduleOptions` 构建
- `filteredFeatures`
- `groupName`
- `progressStatusKey`
- `averageProgressValues`
- `featureSearchText`
- patch 合并逻辑
- Excel import preview 相关逻辑
- title group 批量编辑状态逻辑
- Drawer 保存后 patch/reload 判断逻辑

建议新增目录：

```txt
apps/hub-v2/web/src/app/features/projects/pages/project-feature-progress-page/
├── services/
│   ├── project-feature-progress-page-state.service.ts
│   ├── project-feature-progress-tree-builder.service.ts
│   ├── project-feature-progress-patch.service.ts
│   ├── project-feature-progress-filter.service.ts
│   └── project-feature-progress-import.facade.ts
├── models/
│   └── project-feature-progress-page.model.ts
└── utils/
    └── project-feature-progress-track-by.ts
```

---

### 2. 新增 Page State Service

新增：

```txt
project-feature-progress-page-state.service.ts
```

职责：

- 保存原始 `ProjectFeatureProgressView`
- 保存 `members`
- 保存 `loading` / `saving` / `error`
- 保存 `keyword` / `moduleFilter` / `statusFilter`
- 保存 `expandedIds`
- 保存 `groupProgressPatches` / `sectionProgressPatches` / `summaryPatch`
- 统一暴露 vm signal/computed
- 提供 `load(projectId)`
- 提供 `reloadKeepingView()`
- 提供 `applyPatchResult(result)`
- 提供 `resetPatches()`
- 提供 `updateFilters()`

注意：

- 不要引入 NgRx / Akita。
- 可以继续使用 Angular signal / computed。
- 页面组件不再直接维护大量 computed。

---

### 3. 树数据改成扁平化 visibleNodes

当前 `ProjectFeatureProgressTreeComponent` 如果仍然接收 `sections` 并递归渲染，请调整为支持扁平化节点输入。

新增模型：

```ts
export type FeatureProgressFlatNodeType = 'section' | 'module' | 'submodule' | 'feature';

export interface FeatureProgressFlatNode {
  id: string;
  rawId: string;
  key: string;
  parentId: string | null;
  type: FeatureProgressFlatNodeType;
  level: number;
  name: string;
  expanded: boolean;
  expandable: boolean;
  childrenCount: number;
  sort: number;

  progress: number;
  computedProgress?: number;
  manualProgress?: number | null;
  completedCount?: number;
  featureCount?: number;
  remark?: string | null;

  feature?: ProjectFeaturePoint;
  moduleGroupId?: string | null;
  submoduleGroupId?: string | null;

  status?: ProjectFeaturePointStatus;
  statusText?: string;
  statusClass?: string;
  progressText: string;
  typeText: string;
}
```

新增 tree builder service：

```txt
project-feature-progress-tree-builder.service.ts
```

职责：

- 将 `ProjectFeatureProgressView` + filters + patches 转换为 `allFlatNodes`
- 根据 `expandedIds` 生成 `visibleNodes`
- 生成 `moduleOptions`
- 生成 status map
- 生成搜索索引
- 所有进度文本、状态文本、类型文本提前计算，不在模板里计算

---

### 4. Tree 组件使用 CDK Virtual Scroll

修改：

```txt
apps/hub-v2/web/src/app/features/projects/components/project-feature-progress-tree/
```

要求：

- 输入由 `[sections]` 改成优先支持 `[nodes]`
- 使用 `cdk-virtual-scroll-viewport`
- `itemSize` 建议 48
- `minBufferPx` 建议 480
- `maxBufferPx` 建议 960
- 每一行固定高度
- 行内容不能撑高
- 使用稳定 `trackBy`：`node.id`
- 展开 / 收起通过事件交给 page state service 处理

示例接口：

```ts
@Input() nodes: FeatureProgressFlatNode[] = [];
@Input() canManage = false;
@Input() progressStatusOptions: ProjectFeatureProgressStatusOption[] = [];
@Output() toggleNode = new EventEmitter<string>();
@Output() editFeature = new EventEmitter<ProjectFeaturePoint>();
@Output() deleteFeature = new EventEmitter<string>();
@Output() editGroup = new EventEmitter<FeatureProgressGroupEditTarget>();
@Output() deleteGroup = new EventEmitter<FeatureProgressGroupDeleteTarget>();
@Output() editTitle = new EventEmitter<FeatureProgressTitleGroup>();
```

模板中不要再出现多层递归 `@for section -> group -> subgroup -> feature`。

---

### 5. 页面模板改薄

`project-feature-progress-page.component.ts` 内联 template 建议拆到 html 文件，或者至少大幅缩短。

目标页面模板结构：

```html
<app-page-header ... />

@if (!projectId()) {
  <app-list-state ... />
} @else {
  <app-list-state [loading]="state.loading()" ...>
    <app-project-feature-progress-stats ... />
    <app-project-feature-progress-toolbar ... />

    @if (state.importPreview(); as preview) {
      <app-project-feature-progress-import-preview ... />
    }

    <app-project-feature-progress-tree
      [nodes]="state.visibleNodes()"
      [canManage]="canManage()"
      [progressStatusOptions]="state.statusOptions()"
      (toggleNode)="state.toggleNode($event)"
      (editFeature)="startEdit($event)"
      (deleteFeature)="deleteFeaturePoint($event)"
      (editGroup)="startEditGroup($event)"
      (deleteGroup)="deleteFeaturePointGroup($event)"
      (editTitle)="startEditTitle($event)"
    />

    <app-project-feature-point-drawer ... />
    <app-project-feature-point-group-drawer ... />
    <app-project-feature-progress-overall-drawer ... />
  </app-list-state>
}
```

---

### 6. 保存后优先局部 patch，减少 reload()

检查以下方法中的 `reload`：

- `confirmImport`
- `saveTitleEdit`
- `saveFeaturePoint`
- `deleteFeaturePoint`
- `deleteFeaturePointGroup`
- `saveOverallProgress`
- `clearOverallProgress`
- `saveFeatureProgressSettings`

要求：

#### 可以保留 reload 的场景

- Excel 批量导入大量新增功能点，可以暂时保留 `reload`。
- 状态配置更新可能影响所有状态区间和颜色，可以暂时保留 `reload`。
- 批量标题编辑如果后端暂未提供增量结果，可以暂时保留 `reload`，但需要标记 TODO。

#### 必须改成局部 patch 的场景

- 编辑单个功能点
- 删除单个功能点
- 保存模块/子模块进度
- 保存整体进度
- 清除整体手动进度
- 删除空模块/子模块

这些操作需要使用后端返回的增量汇总结果更新：

- 当前节点
- 父级节点
- section
- summary
- `visibleNodes`

不要全量调用 `getFeatureProgress`。

---

## 二、前端 API 类型调整

修改：

```txt
apps/hub-v2/web/src/app/features/projects/models/project.model.ts
```

新增统一增量结果类型：

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

如果已有 `ProjectFeaturePointGroupUpdateResult`，可以兼容保留，但建议让它扩展统一结构：

```ts
export interface ProjectFeaturePointGroupUpdateResult extends ProjectFeatureProgressIncrementalResult {
  group: ProjectFeaturePointGroup;
}
```

修改 `ProjectApiService`：

- `updateFeaturePoint` 返回 `ProjectFeatureProgressIncrementalResult` 或专用 `UpdateFeaturePointResult`
- `removeFeaturePoint` 返回 `ProjectFeatureProgressIncrementalResult`
- `upsertFeatureProgressOverride` 返回 `ProjectFeatureProgressIncrementalResult`
- `removeFeatureProgressOverride` 返回 `ProjectFeatureProgressIncrementalResult`
- `updateFeaturePointGroup` 保持返回 `ProjectFeaturePointGroupUpdateResult`

如果后端接口还没有调整，前端先补类型和 TODO，但不要破坏现有编译。

---

## 三、后端增量汇总方案优化

检查并优化：

```txt
apps/hub-v2/server/src/modules/project
```

目标是统一“功能点进度变更后返回局部汇总结果”。

### 1. 新增统一增量汇总 service

建议新增或整理：

```txt
apps/hub-v2/server/src/modules/project/services/project-feature-progress-aggregate.service.ts
```

职责：

- 根据 `projectId` 计算 full feature progress view
- 根据 changed feature/group/project override 计算受影响节点
- 返回 `summary`
- 返回 affected modules/submodules
- 返回 affected sections
- 返回 affected featurePoints
- 返回 removed ids

优先实现一个稳定版本：

```ts
buildIncrementalResult(projectId, options)
```

即使内部暂时仍复用现有 full aggregation，也要让接口 contract 先统一，后续再进一步只计算 affected ancestors。

---

### 2. 统一返回结构

以下接口不要只返回实体本身。

#### PATCH /projects/:projectId/feature-points/:featurePointId

当前前端 `ProjectApiService.updateFeaturePoint` 返回 `ProjectFeaturePoint`。

请后端改为返回：

```ts
{
  featurePoint: ProjectFeaturePoint;
  affectedFeaturePoints: ProjectFeaturePoint[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

#### DELETE /projects/:projectId/feature-points/:featurePointId

返回：

```ts
{
  removedFeaturePointIds: string[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

#### PATCH /projects/:projectId/feature-point-groups/:groupId

当前已经返回 `ProjectFeaturePointGroupUpdateResult`，请保持并补齐统一字段：

```ts
{
  group: ProjectFeaturePointGroup;
  nodes: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

建议兼容字段：

- `nodes` 保留，避免前端现有逻辑断裂。
- `modules` 新增，指向同一批受影响模块节点或完整模块树片段。

#### DELETE /projects/:projectId/feature-point-groups/:groupId

返回：

```ts
{
  removedGroupIds: string[];
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

#### PUT /projects/:projectId/feature-progress/overrides

当前前端 `upsertFeatureProgressOverride` 返回 `ProjectFeatureProgressOverrideEntity`。

请改为返回：

```ts
{
  override: ProjectFeatureProgressOverrideEntity;
  projectOverride?: ProjectFeatureProgressOverrideEntity | null;
  modules: ProjectFeatureProgressModuleNode[];
  sections: ProjectFeatureProgressSectionPatch[];
  summary: ProjectFeatureProgressSummary;
}
```

#### DELETE /projects/:projectId/feature-progress/overrides

当前前端 `removeFeatureProgressOverride` 返回 `{ targetType, targetId }`。

请改为返回：

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

## 四、后端计算边界要求

1. 保持 Local-first / 内部协作平台定位，不引入外部服务。
2. 不新增复杂权限模型。
3. 不把进度计算下沉到前端作为唯一来源，后端仍然是进度汇总权威来源。
4. 增量接口必须保证事务一致性：
   - 更新 feature/group/override
   - 重新计算受影响汇总
   - 返回结果
     应在同一请求生命周期内完成。
5. 删除功能点 / 删除空分组时，返回 removed ids，前端据此从 `allFlatNodes` 中移除。
6. 功能点移动模块/子模块时，需要同时返回旧父级和新父级的 affected modules/sections。
7. 手动进度优先级保持现有规则：
   - module/submodule `manualProgress` 优先于 `computedProgress`
   - project overall override 优先于 computed summary
   - 清除 override 后恢复 computed summary

---

## 五、前端 patch service 要求

新增：

```txt
project-feature-progress-patch.service.ts
```

职责：

```ts
applyIncrementalResult(
  current: ProjectFeatureProgressView,
  result: ProjectFeatureProgressIncrementalResult
): ProjectFeatureProgressView
```

处理：

- 替换 `affectedFeaturePoints`
- 删除 `removedFeaturePointIds`
- 替换 affected module/submodule nodes
- 删除 `removedGroupIds`
- 更新 summary
- 更新 project override
- 更新 sections patch
- 保持 `expandedIds` 不变
- 重新生成 `visibleNodes`

注意：

- 不要直接深度 mutation 当前 vm。
- 返回新的对象引用，保证 OnPush/signal 能正确触发。
- 大数组更新使用 Map，避免多层循环 O(n²)。

---

## 六、性能验收标准

完成后请检查：

1. `project-feature-progress-page.component.ts` 明显瘦身，目标 300 行左右。
2. Tree 组件不再递归渲染 sections/groups/subgroups/features，而是渲染 flat `visibleNodes`。
3. `visibleNodes` 超过 300 条时滚动流畅。
4. 展开 / 收起不明显卡顿。
5. 编辑模块/子模块进度后，不调用 `getFeatureProgress` 全量 `reload`。
6. 编辑单个功能点后，不调用 `getFeatureProgress` 全量 `reload`。
7. 删除单个功能点后，不调用 `getFeatureProgress` 全量 `reload`。
8. 保存整体进度 / 清除整体进度后，不调用 `getFeatureProgress` 全量 `reload`。
9. 顶部统计、模块进度、子模块进度、分组标题统计保持正确。
10. 搜索、模块筛选、状态筛选仍然正常。
11. Drawer 打开/关闭动画不再被整棵树刷新拖慢。
12. `npm run build` 或项目现有 web/server 类型检查通过。

---

## 七、允许暂缓的内容

以下内容可以标记 TODO，不强制本次完成：

1. Excel 批量导入后的完全增量 patch。
2. 批量修改分组标题后的完全增量 patch。
3. 状态配置变更后的完全增量 patch。
4. 真正数据库级别的最小 affected ancestors 计算。

但请先统一后端返回 contract，避免前端继续依赖全量 reload。
