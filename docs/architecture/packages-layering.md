# Packages 分层规范

> 本文档用于固化 `ng-manager` monorepo 中 `packages/*` 的分层边界、依赖方向与演进约束。
>
> 目标：避免包职责膨胀、反向依赖、框架绑定和能力边界模糊，保证 ng-manager 作为本地优先工程管理平台长期可维护。

## 1. 层级定义

当前 `packages` 按职责划分为五层：

```txt
基础支撑层
  ↓
领域能力层
  ↓
Core 聚合层
  ↓
Server 适配层
  ↓
启动宿主层
```

### 1.1 基础支撑层

包含：

```txt
errors
shared
protocol
event
logger
storage
```

职责：

- 提供跨包通用能力。
- 提供错误、协议、事件、日志、存储等基础抽象。
- 不感知具体业务能力。
- 不绑定 Fastify / Electron / Angular。

建议定位：

| 包 | 定位 |
|---|---|
| `errors` | 统一错误类型、错误码、业务异常 |
| `shared` | 通用工具函数、基础类型 |
| `protocol` | HTTP / WebSocket / IPC / 前后端共享 DTO |
| `event` | 本地事件总线抽象与实现 |
| `logger` | 系统日志、任务日志、日志存储抽象 |
| `storage` | JSON / SQLite 等本地存储适配 |

### 1.2 领域能力层

包含：

```txt
project
process
task
config
deps
node-version
sprite
svn
nginx
api
bootstrap
ais
```

职责：

- 承载具体工程能力。
- 每个包应尽量具备独立领域边界。
- 可以依赖基础支撑层。
- 不依赖 `server`、`cli`、`desktop`、`webapp`。
- 不直接依赖 Fastify / Electron / Angular。

建议定位：

| 包 | 定位 |
|---|---|
| `project` | 项目识别、项目元数据、工作区上下文 |
| `process` | 本地进程驱动与进程管理抽象 |
| `task` | 任务启动、停止、状态、日志、事件 |
| `config` | 工程配置读取、解析、修改、写回 |
| `deps` | 依赖分析、npm registry 查询、本地 node_modules 读取 |
| `node-version` | Node 版本检测、项目版本要求识别、版本管理器适配 |
| `sprite` | 雪碧图生成、样式元数据生成 |
| `svn` | SVN 同步、状态管理、事件推送 |
| `nginx` | 本地 Nginx 配置、启动、停止、日志管理 |
| `api` | API 调试、请求集合、Postman / Apifox 格式支持 |
| `bootstrap` | 项目初始化、模板导入、启动流程编排 |
| `ais` | AIS 相关领域能力 |

### 1.3 Core 聚合层

包含：

```txt
core
```

职责：

- 作为本地能力组合根。
- 统一装配基础设施与领域能力。
- 暴露 `CoreApp` 作为唯一核心能力门面。
- 管理能力生命周期，例如缓存 flush、timer 停止、资源释放。
- 不处理 HTTP、WebSocket 路由、Electron 窗口、Angular UI。

推荐定位：

```txt
core = Application Core / Composition Root
```

### 1.4 Server 适配层

包含：

```txt
server
```

职责：

- Fastify 本地服务适配层。
- 暴露 HTTP API。
- 暴露 WebSocket 通道。
- 托管 webapp 静态资源。
- 注册 request-id、error-handler、success-handler 等通用插件。
- 通过 `corePlugin` 注入 `CoreApp`。

禁止：

- 不在 `server` 中实现核心业务逻辑。
- 不在 `server` 中直接散落创建领域服务。
- 不让领域包反向依赖 `server`。

### 1.5 启动宿主层

包含：

```txt
cli
desktop
webapp
```

职责：

| 包 / 应用 | 定位 |
|---|---|
| `cli` | 命令行入口，管理本地 server 生命周期 |
| `desktop` | Electron 桌面宿主，管理窗口与本地服务生命周期 |
| `webapp` | Angular UI，消费 HTTP / WebSocket / protocol DTO |

说明：

- `cli` 可以依赖 `runtime` 和 `server`。
- `desktop` 可以启动或托管本地服务，但不应承载核心业务逻辑。
- `webapp` 只作为 UI 层，不应复制 core 逻辑。

## 2. 允许依赖方向

推荐依赖方向如下：

```txt
errors / shared
  ↓
protocol / event / logger / storage
  ↓
project / process / task / config / deps / node-version / sprite / svn / nginx / api / bootstrap / ais
  ↓
core
  ↓
server
  ↓
cli / desktop / webapp
```

简化表达：

```txt
基础层 → 领域层 → Core → Server → 启动宿主层
```

允许规则：

1. 上层可以依赖下层。
2. 下层禁止依赖上层。
3. 领域能力包可以依赖基础支撑层。
4. `core` 可以依赖多个领域能力包。
5. `server` 应通过 `CoreApp` 访问核心能力。
6. `webapp` 应通过 HTTP / WebSocket / protocol DTO 消费能力。

## 3. 禁止依赖方向

### 3.1 基础层禁止依赖上层

以下依赖禁止出现：

```txt
errors    → core / server / cli / desktop / webapp
shared    → core / server / cli / desktop / webapp
protocol  → core / server / cli / desktop / webapp
event     → core / server / cli / desktop / webapp
logger    → core / server / cli / desktop / webapp
storage   → core / server / cli / desktop / webapp
```

### 3.2 领域层禁止依赖框架适配层

以下依赖禁止出现：

```txt
project      → server / Fastify / Electron / Angular
task         → server / Fastify / Electron / Angular
process      → server / Fastify / Electron / Angular
config       → server / Fastify / Electron / Angular
deps         → server / Fastify / Electron / Angular
node-version → server / Fastify / Electron / Angular
sprite       → server / Fastify / Electron / Angular
svn          → server / Fastify / Electron / Angular
nginx        → server / Fastify / Electron / Angular
api          → server / Fastify / Electron / Angular
bootstrap    → server / Fastify / Electron / Angular
ais          → server / Fastify / Electron / Angular
```

### 3.3 `project` 包禁止变成小型 core

`project` 是工作区上下文基础，不应反向依赖其他领域能力。

禁止：

```txt
project → task
project → deps
project → config
project → sprite
project → svn
project → server
```

允许：

```txt
task   → project
deps   → project
config → project
sprite → project
svn    → project
```

### 3.4 `server` 禁止承载核心业务状态

`server` 只能作为适配层。

不推荐：

```ts
// server 中直接 new 领域服务，并持有复杂业务状态
const taskService = new TaskServiceImpl(...);
```

推荐：

```ts
// server 通过 fastify.core 访问能力
await fastify.core.task.start(...);
```

## 4. Core 层约束

`core` 的职责是装配，而不是实现所有业务。

允许：

- 创建 `CoreApp`。
- 组合 infra 与 domain services。
- 管理 dispose 生命周期。
- 建立 `project → task / deps / config / sprite / svn` 等依赖关系。

不建议：

- 在 `core-app.ts` 中写具体业务逻辑。
- 在 `core` 中直接写 HTTP route。
- 在 `core` 中依赖 Fastify / Electron / Angular。
- 所有新能力都直接堆进 `core-app.ts`。

推荐：

```txt
packages/core/src/app/composers/
  infra.composer.ts
  project.composer.ts
  task.composer.ts
  deps.composer.ts
  config.composer.ts
  node-version.composer.ts
  sprite.composer.ts
  svn.composer.ts
```

每个 composer 只负责对应能力装配。

## 5. Server 层约束

`server` 的职责：

- Fastify app 创建。
- 注册插件。
- 注册 routes。
- 注册 WebSocket。
- 注册静态资源。
- 将请求转换为 core 调用。
- 将 core 返回值转换为 HTTP DTO。

推荐调用方式：

```txt
HTTP Request
  ↓
server route
  ↓
fastify.core.xxx
  ↓
core / domain service
```

## 6. Protocol 包演进方向

`protocol` 后续应逐步承载前后端共享协议类型。

建议结构：

```txt
packages/protocol/src/
  http/
  ws/
  task/
  project/
  config/
  nginx/
  api/
  index.ts
```

建议内容：

| 目录 | 内容 |
|---|---|
| `http` | 统一响应结构、分页结构、错误响应 DTO |
| `ws` | WebSocket 消息 envelope、事件 payload |
| `task` | 任务事件、任务状态、任务 DTO |
| `project` | 项目 DTO、项目识别结果 |
| `config` | 配置读取 / 写回 DTO |
| `nginx` | Nginx 状态、配置、日志 DTO |
| `api` | API 调试请求 / 响应 DTO |

## 7. 新包引入规则

新增 package 前需要确认：

1. 它属于哪一层？
2. 是否能独立描述职责？
3. 是否需要被 `core` 装配？
4. 是否依赖 Fastify / Electron / Angular？
5. 是否会造成反向依赖？
6. 是否只是某个现有领域包的内部实现？

推荐判断：

| 情况 | 建议 |
|---|---|
| 有独立领域模型和独立测试价值 | 可以新建 package |
| 只是某个领域能力的内部工具 | 放在该领域包内部 |
| 只是 HTTP route | 放在 server |
| 只是 UI 展示逻辑 | 放在 webapp |
| 只是装配逻辑 | 放在 core composer |

## 8. 当前阶段执行建议

当前阶段优先级：

1. 固化本文档作为依赖边界基线。
2. `core` 内部继续保持 composer 结构。
3. `infra` 支持 process driver 注入，避免 PTY 写死。
4. composer 返回统一 dispose handle。
5. 统一事件类型，减少 `as IEventBus<>` 强转。
6. 后续再推进 `nginx / api` 纳入 core composer。
7. 再逐步强化 `protocol` 包。

## 9. 一句话原则

```txt
领域能力不绑定框架，core 只做装配，server 只做适配，cli / desktop / webapp 只做宿主入口。
```
