# SQLite 单库改造说明（本阶段）

> 目标：将 ng-manager 从 JSON / JSONL 文件存储直接迁移到单实例主库（`ng-manager.db`），并保持对历史数据文件的兼容迁移。

## 1. 改造背景

改造前，业务数据主要落在 JSON / JSONL 文件中（如 `projects.kv.json`、`projects.json`、`api` 目录下 scoped `*.kv.json`、`history.jsonl`、`dashboard/*.json`、`svn.runtime.json`、`npm-latest.kv.json`）。

改造后，统一由 `CoreApp` 创建并持有唯一 SQLite 连接，业务域写入同一个 `ng-manager.db`，并通过 App 级迁移入口兼容导入历史 JSON 文件（含 `.legacy.*`）。

## 2. 本阶段范围

已纳入单库：

- `project`
- `api`（request/env/collection/history）
- `dashboard`
- `svn`
- `sprite`
- `deps`
- `nginx`（binding 状态）

暂不纳入本阶段（保持文件存储）：

- `runtime` 本地锁（`ngm.lock.json`）

## 3. 关键架构调整

### 3.1 App 级单库上下文

- 新增 `packages/storage/src/sqlite/app-storage-context.ts`
- 默认主库路径：`{dataDir}\ng-manager.db`
- `createCoreApp()` 统一创建并在 `dispose()` 统一关闭连接

### 3.2 迁移触发点统一收口（App 级）

- 新增 `packages/core/src/infra/storage/migrations/run-app-storage-migrations.ts`
- 在 `createCoreApp()` 启动初期统一执行 JSON/JSONL 迁移
- 各 domain composer / infra 增加 `migrateIfNeeded?: boolean`，由 `core` 统一传 `false` 防止重复迁移

### 3.3 Domain 侧约束

- 允许 repo 内部继续保留 `CREATE TABLE IF NOT EXISTS`（当前阶段可接受）
- 禁止 domain 自己 `createSqliteDatabase(path.join(..., "*.db"))`

## 4. 迁移兼容策略（重要）

当前不依赖“旧分库文件”进行迁移，优先兼容老用户真实数据形态：

1. 优先读取原始 JSON / JSONL（如 `projects.kv.json`）
2. 若原始文件不存在，自动尝试同目录最新 `.legacy.<timestamp>` 文件
3. 导入成功后，仅对“原始文件”执行备份重命名；若来源本身已是 `.legacy.*`，不再二次重命名

已覆盖迁移点：

- `projects.kv.json` / `projects.json`
- `api` 下 scoped `*.kv.json` 与 `history.jsonl`
- `dashboard/*.json`
- `runtime/svn.runtime.json`
- `cache/npm-latest.kv.json`
- `nginx/binding.json`

## 5. 主要改造文件（摘要）

- `packages/storage/src/sqlite/app-storage-context.ts`
- `packages/storage/src/sqlite/index.ts`
- `packages/core/src/app/core-app.ts`
- `packages/core/src/infra/storage/index.ts`
- `packages/core/src/infra/storage/migrations/index.ts`
- `packages/core/src/infra/storage/migrations/app-migration-runner.ts`
- `packages/core/src/infra/storage/migrations/run-app-storage-migrations.ts`
- `packages/project/src/infra/create-project-domain.ts`
- `packages/core/src/app/composers/api.composer.ts`
- `packages/core/src/app/composers/dashboard.composer.ts`
- `packages/core/src/app/composers/deps.composer.ts`
- `packages/core/src/app/composers/svn.composer.ts`
- `packages/core/src/app/composers/nginx.composer.ts`
- `packages/svn/src/infra/create-svn-domain.ts`
- `packages/sprite/src/infra/create-sprite-domain.ts`
- `packages/nginx/src/storage/nginx-binding.store.ts`
- `packages/storage/src/sqlite/json-kv-migration.ts`
- `packages/project/src/infra/project.migrate.ts`
- `packages/api/src/infra/storage/sqlite/sqlite-migrate.ts`
- `packages/core/src/infra/dashboard/dashboard-migrate.ts`
- `packages/svn/src/infra/sqlite-svn-runtime.repo.ts`

## 6. 当前阶段验证建议

1. 删除 `ng-manager.db`（保留 JSON / JSONL 或其 `.legacy.*`）
2. 启动应用，确认自动迁移到新主库
3. 执行构建：`npm run build`
4. 回归关键能力：项目、API、Dashboard、SVN、Sprite、Deps

## 6.1 本地验证结果（已通过）

- 已完成本地验证，迁移链路可用。
- 当前验证基线：删除 `ng-manager.db` 后，保留 JSON / JSONL（含 `.legacy.*`）可重新导入并恢复主库数据。
- 辅助脚本：`scripts/restore-legacy-filenames.ps1`（用于递归恢复 `.legacy.<timestamp>` 文件名）。

## 7. 第二阶段（已完成）

已完成“迁移执行元信息与版本化”：

- 在 `packages/core/src/infra/storage/migrations/` 下新增 app-level migration runner
- 新增迁移元信息表：`app_migrations(version, name, applied_at)`
- 迁移改为按版本注册执行（当前为 `20260511-001` ~ `20260511-007`）
- 启动时按版本幂等执行，不再仅靠“目标表是否为空”判断

已决策（当前状态）：

- runtime 本地锁保持文件存储（`ngm.lock.json`），不并入主库

