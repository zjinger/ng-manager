# Config Provider 化改造落地（packages/config）

> 本文档记录 `packages/config` 从旧 Domain/Schema 体系迁移到 Provider 架构后的落地结果，作为后续增强与协作基线。

## 1. 改造目标

1. 将配置能力从“按模块硬编码”改为“按 Provider 插件扩展”。
2. 复用 `@yinuo-ngm/shared` 的通用能力（JSON/JSONC/FS/Patch），`config` 仅保留配置领域逻辑。
3. 统一错误体系到 `@yinuo-ngm/errors`。
4. 打通 `core -> server -> webapp` 的配置读取、预览、写回链路。

## 2. 当前架构结果

`packages/config` 现已形成标准 Provider 结构：

```txt
types/
  config-provider.ts
  config-document.ts
  config-schema.ts
  config-patch.ts
  config-detect.ts
registry/
  config-provider.registry.ts
service/
  config.service.ts
providers/
  angular/
  tsconfig/
  package-json/
  vue/
  vite/
  env/
utils/
  config-path.ts
```

核心编排关系：

```txt
ConfigService
  -> ConfigProviderRegistry
      -> provider.detect/read/getSchema/preview?/write?
```

## 3. 能力边界（已固化）

- `packages/config`
  - 负责：配置检测、读取、Schema 组织、预览/写回编排、路径安全约束。
  - 不负责：项目识别（由 project/core 提供）、HTTP 路由（由 server 提供）、UI 表达（由 webapp 提供）。

- `packages/shared`
  - 提供底层通用能力：文本/JSON/JSONC 读写、备份、原子写、Patch 应用等。

- `packages/errors`
  - 提供统一 `CoreError/CoreErrorCodes`，含 `CONFIG_*` 错误码。

## 4. Provider 落地状态

| Provider | 状态 | 说明 |
|---|---|---|
| Angular Workspace | 读/预览/写 | 支持 `architect/targets`、默认项目回退、多 configuration 回退与默认值展示 |
| TsConfig | 读/预览/写 | 支持 `extends` 解析与基础字段编辑 |
| package.json | 读/预览/写 | 支持 scripts/依赖等常见字段 |
| Vue | 只读 | 提供项目概览、关键依赖版本、入口与配置文件、scripts |
| Vite | 只读（结构化） | 提供 env/base/plugins/alias/server/proxy/build 结构化视图 + raw |
| .env | 读/预览/写 | 支持基础键值写回（当前以全量内容为主） |

## 5. 服务端与前端对接结果

### 5.1 server 路由（`/api/config/*`）

- `GET /providers`
- `GET /detect/:projectId`
- `GET /doc/:projectId/:type`
- `POST /preview/:projectId`
- `POST /write/:projectId`
- `POST /openInEditor/:projectId`

已落地安全/一致性处理：

1. `openInEditor` 使用 `resolveProjectFile`，避免路径越界。
2. `preview/write` 请求体包含 `patches[]` 结构校验。
3. 移除不必要强制类型断言与冗余响应字段。

### 5.2 webapp 配置页

1. 左侧菜单按后端 `detect.available` 动态显示。
2. 配置项按 `schema + viewModel/raw` 渲染，支持 JSON Pointer 路径。
3. 支持 fallbackPaths 与 metadata.defaultValue（如 Angular 默认值）。
4. 已修复常见布局问题（短内容高度、菜单滚动行为）。

## 6. 关键规则与约束

1. Provider 的 `write` 为可选能力（只读 Provider 可不实现）。
2. `ConfigService` 统一兜底：
   - 无 `preview` -> `CONFIG_UNSUPPORTED_PREVIEW`
   - 无 `write` -> `CONFIG_UNSUPPORTED_WRITE`
3. 注册重复 Provider 使用专用错误码：`CONFIG_PROVIDER_ALREADY_EXISTS`。
4. 路径访问必须经过 `config-path.ts` 的项目根目录边界校验。

## 7. 当前已知限制（后续增强方向）

1. Vite 结构化解析当前为“高价值字段提取”，复杂动态表达式仍以 raw 为准。
2. Vue/Vite 仍以只读为主，尚未开放结构化写回。
3. env 写回目前偏全量，后续可增强为按 key 增量 patch。

## 8. 后续演进建议（增量）

1. 引入 `@yinuo-ngm/protocol` 承载 config 共享 DTO，减少 server/webapp 类型镜像重复。
2. 为 Angular/TsConfig/Vite 增加“effective config（最终生效配置）”视图。
3. 为复杂字段（proxy/alias/paths/fileReplacements）提供更细粒度编辑器。

