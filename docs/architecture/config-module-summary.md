# Config 模块实现总结（packages/config + webapp）

本文基于当前代码实现，汇总配置中心在 `packages/config`、`packages/server`、`packages/protocol`、`webapp` 的落地状态与边界。

## 1. 端到端链路

```txt
webapp 配置页
  -> packages/server /api/config/*
    -> packages/core 注入的 ConfigService
      -> packages/config ConfigProviderRegistry
        -> 各 Provider detect/read/preview/write
```

- **协议层统一**：`@yinuo-ngm/protocol` 已提供 Config DTO（domain/request/response/catalog），前后端复用。
- **服务端职责**：路由编排 + 请求校验 + projectRoot 解析 + openInEditor 安全路径校验。
- **配置包职责**：Provider 检测/读取/schema/预览/写入与错误语义，不承载 UI 逻辑。

## 2. Provider 架构与注册

`packages/config/src/registry/config-provider.registry.ts` 当前默认注册：

1. `angular-workspace`
2. `angular-environment`
3. `tsconfig`
4. `package-json`
5. `vue-project`
6. `vite-config`
7. `env`

关键规则：

- `ConfigProvider.write` / `preview` 为可选能力（只读 Provider 不强制实现）。
- 重复注册抛 `CONFIG_PROVIDER_ALREADY_EXISTS`。
- `ConfigService` 对无 `preview`/`write` 的 Provider 统一抛 `CONFIG_UNSUPPORTED_PREVIEW/WRITE`。

## 3. Provider 边界（当前约定）

| Provider | 角色 | 写入能力 | 说明 |
|---|---|---|---|
| angular-workspace | 管 `angular.json` | 支持 | 含 build/serve/options、环境映射、effective 视图 |
| angular-environment | 管 `src/environments/environment*.ts` | 支持 | raw 模式，`set /raw` |
| tsconfig | 管 `tsconfig*.json` | 支持 | 支持 `extends`/schema 编辑 |
| package-json | 管 `package.json` | 支持 | scripts/deps 等 |
| vue-project | Vue 项目信息 | 只读 | 概览与关键信息展示 |
| vite-config | 管 `vite.config.*` | 只读（当前） | 结构化读取（envDir/server/alias/build/plugins 等） |
| env | 管 `.env*` 与 `env/.env*` | 支持 | 当前按 `set /raw` 整文预览/写入 |

## 4. Env / Angular Environment 细节

### 4.1 Env Provider

- 检测候选：项目根 `.env*` + `env/.env*`。
- 标题语义：`Env 文件`，避免和 Angular environment 混淆。
- preview/write 协议：仅支持 `set /raw`。
- 写入策略：整文件写回，保留注释/空行/引号风格。

### 4.2 Angular Environment Provider

- 独立 type：`angular-environment`。
- 管理 `src/environments/environment*.ts` 固定候选集合。
- schema 为 raw 文本编辑（`path: /raw`），不做 AST 写回。

## 5. Server 接口（/api/config/*）

当前路由：

- `GET /providers`
- `GET /detect/:projectId`
- `GET /doc/:projectId/:type?filePath=...`
- `POST /preview/:projectId`
- `POST /write/:projectId`
- `POST /openInEditor/:projectId`

安全与校验：

- `openInEditor` 使用 `resolveProjectFile` 防路径越界。
- `patches` 做结构校验（op/path/value 必要条件）。

## 6. Webapp 配置页能力（当前）

## 6.1 页面与交互主流程

`project-conf.component.ts` 已支持：

- provider/detect 动态加载
- provider + filePath 双维度切换
- 只读保护（禁用 diff/save）
- patch 生成（对象递归差异）
- preview modal / write 保存 / openInEditor

## 6.2 字段渲染升级（替代普通 textarea）

`config-item-component.ts` 已按字段类型接入：

- `ConfigJsonEditorComponent`：JSON 编辑、格式化、复制、展开/收起、错误提示。
- `ConfigJsonSummaryComponent`：长对象/数组摘要 + 展开编辑。
- `ConfigRawEditorComponent`：raw 文本编辑（等宽字体、保留换行空行）+ 复制。

摘要策略（JSON）：

- key 含 `dependencies/devDependencies/peerDependencies/optionalDependencies` -> summary
- object key 数 > 8 -> summary
- array 长度 > 6 -> summary

## 6.3 Env 可视化增强

- `config-raw-editor` 集成 `ConfigKvPreviewComponent`，展示解析后的 Key/Value 预览。
- `utils/env-kv.ts` 支持：
  - `.env` 文本键值解析
  - `environment.ts` 对象字面量解析（用于展示）
  - before/after 键值 diff（用于预览弹窗）
  - 敏感键识别（password/token/secret/key 等）

## 6.4 变更预览 Diff

`config-preview-modal.component.ts` + `utils/config-diff.ts` 已支持：

- 默认字段级 Diff（label/group/path/op/旧值/新值）
- schema 字段映射（找不到时回退 path）
- JSON Pointer 取值（含 `~1`/`~0`）
- `undefined` 展示为“无”
- 完整 before/after 放入“高级”折叠区
- Env raw 场景优先展示 key/value 级差异

## 7. 现阶段限制与后续方向

当前仍保持的限制：

- 不做 Vite 写回。
- 不做 TypeScript/JS AST 结构化写回。
- 不引入 Monaco/jsondiffpatch 等重依赖。

后续可选增强：

1. `env` 增量 patch（按 key set/remove）替代整文 `set /raw`。
2. 复杂 JSON 字段专用编辑器（如 fileReplacements/proxy/alias/paths）。
3. 只读 Provider 的“能力说明”统一透出到 UI（减少误解）。

