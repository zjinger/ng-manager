# ng-manager SQLite repo 自建表治理评估

## 背景与目标

当前 `packages/storage` 已将 `task_analyze_reports` 从 repo 构造器建表迁移到 schema 初始化（`initSqliteSchema`）路径。本评估聚焦其余 SQLite repo 的“自建表”治理策略，目标是在**不引入新 migration 系统**、**不做本轮代码改造**前提下，给出后续收口优先级与边界。

## Schema ownership 原则

1. `packages/storage` 只维护 storage 包自身直接暴露能力所需的 schema，例如 `task_analyze_reports`。
2. `packages/api` 自己维护 API 模块相关 schema，例如 `api_requests` / `api_envs` / `api_collections` / `api_history`。
3. `packages/core` 只维护 core 内部 infra schema，例如 `dashboard_docs`。
4. 各业务 package 不应把自身 schema 下沉到 `packages/storage`，避免底层包反向感知上层业务。
5. 动态表名 repo 不强制进入静态 schema 初始化体系。

## 1. 当前 repo 自建表清单

| 组件/Repo | 所属 package | 当前建表方式 | 表名 |
| --- | --- | --- | --- |
| `SqliteJsonKvRepo` | `packages/storage` | 构造器 `ensureTable()` | 动态（由 `tableName` 决定） |
| `SqliteDashboardRepo` | `packages/core` | 构造器 `createDashboardTable()` | `dashboard_docs` |
| `SqliteScopedJsonRepoBase`（`SqliteRequestRepo` / `SqliteEnvRepo` / `SqliteCollectionRepo`） | `packages/api` | 基类构造器 `createScopedJsonTable()` | `api_requests` / `api_envs` / `api_collections` |
| `SqliteHistoryRepo` | `packages/api` | 构造器 `createHistoryTable()` | `api_history` |
| `SqliteSvnRuntimeRepo` | `packages/svn` | 构造器 `createRuntimeTable()` | `svn_runtime` |
| `SqliteSpriteRepo` | `packages/sprite` | 构造器 `createSpriteTable()` | `sprite_configs` |
| `createSqliteNginxBindingStore`（store 形态） | `packages/nginx` | 工厂内 `createSqliteBindingTable()` | `nginx_binding_state` |

补充（非业务 repo，但涉及建表治理边界）：

| 组件 | 所属 package | 表名 | 说明 |
| --- | --- | --- | --- |
| `runAppMigrationRunner` | `packages/core` | `app_migrations` | 应用迁移元数据表，应由 runner 自维护 |
| `SqliteMigrationRunner` | `packages/storage` | `schema_migrations` | SQL migration 元数据表，应由 runner 自维护 |

## 2. 表结构与属性评估

| Repo/组件 | 表结构摘要 | 固定业务表 | 动态通用表 | 是否适合 schema 收口 | 推荐收口位置 | 推荐优先级 |
| --- | --- | --- | --- | --- | --- | --- |
| `SqliteDashboardRepo` | `dashboard_docs(project_id PK, value)` | 是 | 否 | 适合 | `packages/core` 下 dashboard schema 初始化（package 内） | **P1（高）** |
| `SqliteRequest/Env/CollectionRepo` | `scope + project_id + id` 复合主键，`value` JSON | 是 | 否 | 适合 | `packages/api` 下统一 schema 初始化（package 内） | **P2（中高）** |
| `SqliteHistoryRepo` | `api_history(id PK, scope, project_id, created_at, value)` + 组合索引 | 是 | 否 | 适合 | 与 API scoped 三表同一 `packages/api` schema 初始化 | **P2（中高）** |
| `SqliteSvnRuntimeRepo` | `svn_runtime(project_id, source_id, value)` 复合主键 | 是 | 否 | 适合（但收益一般） | `packages/svn` 内 schema 初始化 | P3（中） |
| `SqliteSpriteRepo` | `sprite_configs(project_id PK, value)` | 是 | 否 | 适合（但收益一般） | `packages/sprite` 内 schema 初始化 | P3（中） |
| `createSqliteNginxBindingStore` | `nginx_binding_state(id=1 CHECK, path, updated_at)` | 是 | 否 | 适合（但为 store 非 repo） | `packages/nginx` 内 schema 初始化 | P3（中） |
| `SqliteJsonKvRepo` | `{id PK, value}`，表名运行时传入 | 否 | **是** | **暂不建议收口** | 保留 repo 内 `ensureTable` | **保留现状** |
| `runAppMigrationRunner` / `SqliteMigrationRunner` | 迁移记录元数据表 | 否 | 否 | **不应纳入业务 schema 收口** | 继续由 runner 自维护 | **保留现状** |

## 3. 关键风险点

1. **构造器副作用迁移风险**：当前多个迁移流程通过“实例化 repo 即建表”隐式依赖表存在；若收口后未同步调整初始化顺序，迁移/启动会直接报表不存在。
2. **初始化职责错位风险**：把跨 package 业务表统一塞进 `packages/storage` 会扩大 ownership 边界，形成“底层包承载上层业务 schema”的反向依赖。
3. **动态表名场景不适配风险**：`SqliteJsonKvRepo` 由调用方传 `tableName`，中心化静态 schema 难覆盖，强收口会引入额外注册协议与耦合。
4. **索引一致性风险**：像 `api_history` 既有表又有索引，收口时若遗漏索引初始化会导致查询/清理性能回退。
5. **兼容迁移流程风险**：`migrateLegacy*IfNeeded` 通常依赖“先确保表存在再导入”；收口后需保证导入入口前已完成对应 schema init。

## 4. 后续收口前置条件

每个 repo 从构造器建表迁移到 schema init 前，必须先确认：

1. 该 repo 的所有实例化入口。
2. 对应 schema init 的调用时机早于 repo 使用。
3. 迁移流程中是否依赖“实例化 repo 即建表”。
4. 是否存在单元测试或启动流程可覆盖表创建。
5. 是否有索引、默认值、CHECK 约束、复合主键等容易遗漏的结构。

## 5. 推荐治理策略（分阶段）

1. **下一阶段优先：`SqliteDashboardRepo` 收口（低风险）**  
   单表、单索引面、调用面集中在 core，适合作为下一步模板。

2. **随后：API package 级收口（中风险）**  
   把 `api_requests/api_envs/api_collections/api_history` 组合成 `packages/api` 统一 schema init，避免分散在多个 repo 构造器中。

3. **`SqliteJsonKvRepo` 保留 repo 内 ensureTable（当前最稳）**  
   该 repo 是动态通用能力，不建议当前阶段强制静态化收口。

4. **migration 元数据表继续由 runner 自维护**  
   `app_migrations` / `schema_migrations` 不应混入业务 schema bootstrap。

## 6. 下一阶段建议落地模板：SqliteDashboardRepo

推荐新增：

`packages/core/src/infra/dashboard/dashboard.schema.ts`

导出：

```ts
export function initDashboardSchema(db: SqliteDatabase): void
```

在 dashboard domain 创建入口中，先执行：

```ts
initDashboardSchema(db)
```

再实例化：

```ts
new SqliteDashboardRepo(db)
```

随后在 repo 构造器中删除 `createDashboardTable(db)` 调用。

## 7. 不建议现在处理的内容

1. 不建议引入新的 `.sql` migration 体系或全局迁移目录约定。  
2. 不建议将所有 package 的业务表统一迁入 `packages/storage` 全局 schema。  
3. 不建议改造 `SqliteJsonKvRepo` 的动态建表能力。  
4. 不建议调整 migration runner 对 `app_migrations` / `schema_migrations` 的自维护逻辑。  
5. 不建议在本评估任务中触碰任何全局装配流程；后续每个 schema 收口任务只允许调整对应 package 内的最小初始化入口。  

## 8. 结论

- ✅ `SqliteDashboardRepo`：可作为下一阶段低风险收口对象。  
- ✅ API scoped repos：建议作为后续 **package 级** schema 收口对象。  
- ✅ `SqliteJsonKvRepo`：暂时保留 repo 内 `ensureTable` 能力。  
- ✅ migration 表：继续由 runner 自己维护，不纳入业务 schema 收口。  
