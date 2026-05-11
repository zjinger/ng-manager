# Shared 通用能力改造落地（packages/shared）

> 本文档记录 `packages/shared` 的改造结果，作为后续 `config`、`storage`、`server`、`cli` 等包复用基础能力的统一说明。

## 1. 改造目标

将 `packages/shared` 从单一 ID 工具扩展为基础工具包，统一提供：

- ID 生成工具（兼容历史导出）
- 文件读写能力（含备份、原子写入）
- JSON / JSONC 读写与更新
- JSON Patch 应用
- 对象深度合并与 JSON Pointer 路径操作

核心原则：

1. `shared` 仅提供通用能力，不承载业务逻辑。
2. `shared` 不依赖 `config/storage/server/cli/runtime` 等业务包。
3. 保持 Local-first 场景可用（本地文件读写优先）。

## 2. 当前已落地结构

```txt
packages/shared/src
├── index.ts
├── id/
│   └── id.ts
├── fs/
│   ├── ensure-dir.ts
│   ├── file-exists.ts
│   ├── read-text-file.ts
│   ├── write-text-file.ts
│   ├── backup-file.ts
│   └── atomic-write-file.ts
├── json/
│   ├── json.types.ts
│   ├── read-json-file.ts
│   ├── write-json-file.ts
│   └── update-json-file.ts
├── jsonc/
│   ├── jsonc.types.ts
│   ├── read-jsonc-file.ts
│   ├── write-jsonc-file.ts
│   └── update-jsonc-file.ts
├── patch/
│   ├── json-patch.types.ts
│   └── apply-json-patches.ts
└── object/
    ├── deep-merge.ts
    └── json-pointer.ts
```

## 3. 导出与兼容性

`packages/shared/src/index.ts` 已改为聚合导出，并保持以下历史 API 不变：

- `genId`
- `uid`
- `buildSpecId`
- `buildTaskId`

其中 ID 能力已迁移到 `src/id/id.ts`，对外导入方式保持不变：

```ts
import { genId, uid, buildSpecId, buildTaskId } from "@yinuo-ngm/shared";
```

## 4. 关键能力说明

### 4.1 fs

- `ensureDir/ensureDirSync`：目录不存在时递归创建；路径存在但不是目录时抛错。
- `fileExists/fileExistsSync`：仅 `ENOENT` 返回 `false`，其他异常透传。
- `readTextFile`：支持 `allowMissing/defaultValue`。
- `writeTextFile`：支持 `ensureDir/newline`；内容未变化返回 `changed: false`。
- `backupFile`：默认生成 `<file>.legacy.<timestamp>` 备份；源文件不存在返回 `null`。
- `atomicWriteFile`：先写临时文件再 `rename`，失败时清理临时文件并抛带路径错误。

### 4.2 json

- `readJsonFile`：严格 `JSON.parse`，解析失败错误信息包含文件路径。
- `writeJsonFile` 默认：
  - `spaces: 2`
  - `ensureDir: true`
  - `newline: true`
  - `backup: false`
  - `atomic: true`
- 写入前会比对内容；内容未变不重写，返回 `changed: false`。
- `updateJsonFile`：`read -> updater -> write`。

### 4.3 jsonc

- `readJsoncFile` 基于 `jsonc-parser`，支持注释与尾逗号。
- `writeJsoncFile/updateJsoncFile` 第一阶段使用 `JSON.stringify` 回写（可能丢失注释）。
- 当 `preserveComments: true` 时会显式抛出未实现错误。

### 4.4 object + patch

- `deepMerge`：对象递归合并，数组整体替换，不修改原对象。
- `json-pointer`：提供 `get/set/remove`，支持 `~1`（`/`）和 `~0`（`~`）转义。
- `applyJsonPatches`：支持 `set/remove/append/merge`，且不直接修改输入对象。

## 5. 依赖与构建

- `packages/shared/package.json` 已引入：

```json
{
  "dependencies": {
    "jsonc-parser": "^3.3.1"
  }
}
```

- `shared` 包构建命令：

```bash
npm run -w packages/shared build
```

## 6. 下游使用建议

后续建议 `packages/config`、`packages/storage` 逐步复用 `@yinuo-ngm/shared` 的文件与 JSON/JSONC 能力，避免重复实现底层读写、备份和原子写入逻辑；领域规则仍保留在各自包内，不下沉到 `shared`。

