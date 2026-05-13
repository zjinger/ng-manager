# SQLite Schema Governance 收口进展（本轮）

## 1. 本轮收口背景

基于 `docs/architecture/sqlite-schema-governance.md` 的治理原则，本轮目标是把“业务表初始化”从 repo/store 构造器副作用中收口到明确的 schema init 入口，确保：

- schema ownership 清晰（按 package 归属）
- domain 创建链路可诊断（先 init schema，再实例化 repo/store）
- App 级迁移可控（`runAppStorageMigrations` 统一编排）

本轮不引入新的 migration 框架、不改 API 协议、不改前端表现。

## 2. 已完成模块清单

已完成“显式 schema init + repo/store 去建表副作用”的模块：

1. Dashboard（`dashboard_docs`）
2. API（`api_requests` / `api_envs` / `api_collections` / `api_history`）
3. Sprite（`sprite_configs`）
4. SVN（`svn_runtime`）
5. Nginx binding（`nginx_binding_state`）
6. Task Analyze Report（`task_analyze_reports`，归属 `packages/storage`）

## 3. 各模块 schema init 入口

| 模块 | schema init 函数 | init 调用入口 | 备注 |
| --- | --- | --- | --- |
| Dashboard | `initDashboardSchema` | `packages/core/src/app/composers/dashboard.composer.ts` + `packages/core/src/infra/storage/migrations/run-app-storage-migrations.ts` | domain 创建与迁移回填均显式 init |
| API | `initApiSqliteSchema` | `packages/core/src/app/composers/api.composer.ts` + `packages/core/src/infra/storage/migrations/run-app-storage-migrations.ts` | scoped 三表 + history 统一 init |
| Sprite | `initSpriteSchema` | `packages/sprite/src/infra/create-sprite-domain.ts` + `run-app-storage-migrations.ts` | 迁移前先建表 |
| SVN | `initSvnSchema` | `packages/svn/src/infra/create-svn-domain.ts` + `run-app-storage-migrations.ts` | 迁移与运行链路一致 |
| Nginx | `initNginxSchema` | `packages/core/src/app/composers/nginx.composer.ts` + `run-app-storage-migrations.ts` | sqlite store 使用前显式 init |
| Task Analyze Report | `initSqliteSchema`（内部调用 `initTaskAnalyzeReportSchema`） | `packages/storage/src/sqlite/app-storage-context.ts` | storage 包自身 schema 入口 |

## 4. repo/store 去副作用后的职责变化

本轮后职责边界：

- **schema init 负责结构保证**：由 composer / migration runner / app storage context 统一调用 init 函数。
- **repo/store 负责纯读写语义**：repo/store 构造器不再隐式建表，实例化不再承担 DDL 副作用。
- **迁移流程负责数据搬迁**：`runAppStorageMigrations` 在 App 启动时统一编排历史 JSON/JSONL 导入。

带来的结果是：初始化顺序可追踪、错误定位更直接、跨模块依赖关系更稳定。

## 5. 保留项说明

以下项按治理策略保留现状（本轮不收口为静态 schema）：

1. `SqliteJsonKvRepo` 动态表名能力（`ensureTable()`）  
   - 仍用于 `projects`、`deps_latest_cache_snapshots` 等动态/通用 KV 场景。
2. 迁移元数据表自维护  
   - `app_migrations` 由 `runAppMigrationRunner` 管理。  
   - `schema_migrations` 由 `SqliteMigrationRunner` 管理。

## 6. 后续不建议继续扩大的范围

1. 不把各业务 package 的 schema 统一下沉到 `packages/storage`。  
2. 不在当前阶段强制移除 `SqliteJsonKvRepo` 的动态建表能力。  
3. 不引入新的全局 SQL migration 目录/框架替代当前 app-level 迁移编排。  
4. 不把 migration 元数据表并入业务 schema 初始化职责。  

## 7. 验证命令

建议按以下顺序执行：

```bash
# 1) 关键包编译
npm run -w packages/storage build
npm run -w packages/api build
npm run -w packages/core build
npm run -w packages/sprite build
npm run -w packages/svn build
npm run -w packages/nginx build

# 2) 全仓编译
npm run build
```

如需验证迁移链路，再做一次冷启动回归（保留历史 JSON/JSONL，重建主库后启动应用）。
