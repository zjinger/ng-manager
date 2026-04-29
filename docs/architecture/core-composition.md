# Core Composition

> 记录 Core 层架构规则，确保能力装配的一致性和可维护性。

---

## 1. CoreApp 定位

`CoreApp` 是 ng-manager 的本地能力组合根（Composition Root）。

**职责：**
- 统一装配所有本地工程管理能力
- 提供唯一的对外访问门面（server / cli / desktop 都通过 CoreApp 访问能力）
- 管理所有领域的生命周期（dispose）

**约束：**
```txt
server / cli / desktop 只能通过 CoreApp 访问核心能力
不允许直接创建领域服务实例
```

**当前 CoreApp 接口：**
```typescript
interface CoreApp {
  // infra
  events: IEventBus<CoreEventMap>;
  sysLog: SystemLogService;

  // workspace
  project: ProjectService;
  fs: FsService;

  // execution
  task: TaskService;
  bootstrap: ProjectBootstrapService;

  // analysis
  deps: DepsService;
  nodeVersion: NodeVersionService;
  config: ConfigService;

  // tools
  sprite: SpriteService;
  svnSync: SvnSyncService;

  // external capabilities
  nginx: NginxApp;
  apiClient: ApiClient;

  dispose(): Promise<void>;
}
```

---

## 2. CreateCoreAppOptions

`CreateCoreAppOptions` 是创建 CoreApp 的唯一入口参数。

**当前定义：**
```typescript
interface CreateCoreAppOptions {
  /** 数据目录（存储项目列表等） */
  dataDir: string;

  /** 系统日志最大条数，默认 10000 */
  sysLogCapacity?: number;

  /** 外部注入的 ProcessService（优先级高于 processDriver） */
  processService?: ProcessService;

  /** 外部注入的 ProcessDriver（用于创建默认 ProcessService） */
  processDriver?: IProcessDriver;
}
```

**优先级规则：**
```typescript
const processService =
  opts.processService ??
  new ProcessService(opts.processDriver ?? new PtyProcessDriver());
```

**扩展原则：**
- 新增可选字段需向后兼容
- 不允许新增必填字段（dataDir 除外）

---

## 3. Core Infra

`CoreInfra` 是 core 的基础设施层，由 `createInfra()` 创建。

**职责：**
- 事件总线（MemoryEventBus）
- 系统日志（SystemLogService + RingLogStore）
- 任务日志（RingLogStore）
- 进程驱动（ProcessService）

**创建链路：**
```typescript
const infra = createInfra(opts);
// infra 结构：
// {
//   events: MemoryEventBus<CoreEventMap>
//   sysLog: SystemLogServiceImpl
//   taskStreamLogStore: RingLogStore
//   dataDir: string
//   cacheDir: string
//   processService: ProcessService
// }
```

**约束：**
- infra 只能依赖基础包（errors / event / logger / storage）
- infra 禁止依赖领域包（project / task / nginx 等）

---

## 4. Domain Composer 规则

每个领域能力通过 `createXxxDomain()` 函数装配。

**命名规范：**
```typescript
export function create{Noun}Domain(opts: { ... }): ... {
  // 创建领域服务
  // 返回 CoreDomainHandle
}
```

**职责边界：**
- 负责领域服务的创建和装配
- 负责领域相关的生命周期管理
- 负责领域相关的持久化（如 binding store）

**当前 composers：**
```txt
createProjectDomain      → project
createTaskDomain         → task
createDepsDomain         → deps
createConfigDomain       → config
createSpriteDomain       → sprite
createSvnDomain          → svn
createNodeVersionDomain  → node-version
createBootstrapDomain    → bootstrap
createNginxDomain        → nginx
createApiClientDomain    → api
createFsDomain           → fs
createDashboardDomain    → dashboard
```

**禁止事项：**
- composer 禁止直接创建 Fastify / HTTP 相关的对象
- composer 禁止依赖 server / cli / webapp

---

## 5. CoreDomainHandle 生命周期规范

`CoreDomainHandle` 是 composer 返回的统一包装类型。

**定义：**
```typescript
export interface CoreDomainHandle<T> {
  service: T;
  dispose?: () => Promise<void> | void;
}
```

**使用模式：**
```typescript
// composer 返回 handle
export async function createDepsDomain(opts: { ... }): Promise<CoreDomainHandle<DepsService>> {
  const latestCache = new LatestCacheKv(...);
  latestCache.startPruneTimer(...);

  return {
    service: deps,
    async dispose() {
      latestCache.stopPruneTimer();
      await latestCache.flush();
    }
  };
}

// core-app.ts 收集 dispose
const disposables: Array<() => Promise<void> | void> = [];
const depsHandle = await createDepsDomain({ ... });
if (depsHandle.dispose) {
  disposables.push(depsHandle.dispose);
}
```

**如果领域不需要 dispose：**
```typescript
export function createApiClientDomain(opts: { ... }): CoreDomainHandle<ApiClient> {
  const apiClient = new ApiClient(...);
  return { service: apiClient };  // 无 dispose
}
```

---

## 6. dispose 执行顺序

dispose 采用**反向顺序**执行，确保依赖关系正确清理。

**core-app.ts 实现：**
```typescript
return {
  async dispose() {
    for (const dispose of disposables.reverse()) {
      await dispose();
    }
  }
}
```

**当前已接入 dispose 的领域：**
- deps: latestCache.stopPruneTimer() + flush()
- nginx: nginxApp.dispose() → log.stopAll()

**新增领域需要 dispose 的检查点：**
1. 是否有定时器（timer / interval）需要清除？
2. 是否有持久化缓存需要 flush？
3. 是否有监听的事件需要 unsubscribe？
4. 是否有子进程需要 kill？

---

## 7. EventMap 组合规则

`CoreEventMap` 通过 intersection 组合各领域的事件类型。

**结构：**
```typescript
export type CoreOwnEventMap = {
  // core 自己维护的 4 个事件
  [Events.PROJECT_ADDED]: { projectId: string };
  [Events.PROJECT_UPDATED]: { projectId: string };
  [Events.PROJECT_REMOVED]: { projectId: string };
  [Events.SYSLOG_APPENDED]: { entry: SystemLogEntry };
};

export type CoreEventMap =
  & CoreOwnEventMap
  & TaskEventMap        // 来自 @yinuo-ngm/task
  & SvnEventMap         // 来自 @yinuo-ngm/svn
  & BootstrapEventMap;  // 来自 @yinuo-ngm/bootstrap
```

**Events 常量来源：**
```typescript
// task 事件引用 domain 包常量
TASK_STARTED: TaskEvents.TASK_STARTED,

// svn 事件引用 domain 包常量
SVN_SYNC_STARTED: SvnEvents.SYNC_STARTED,
```

**好处：**
- 事件名由领域包统一维护，避免重复定义
- 如果领域包修改事件名，core 编译时报错
- CoreEventMap 不重复维护各领域的 payload 类型

**禁止事项：**
- 禁止在 events.ts 中硬编码 task / svn 事件字符串
- 禁止手写其他领域的事件 payload 类型

---

## 8. nginx / apiClient 纳入 core 的说明

### 8.1 纳入原因

原本 nginx 和 apiClient 的实例在 server plugin 中创建：
```txt
server/nginx.plugin.ts → new NginxApp() → fastify.nginx
server/api-client.plugin.ts → new ApiClient() → fastify.api
```

这违反了 "core 负责能力装配" 的原则。

### 8.2 纳入后的结构

```typescript
// core-app.ts
const nginxHandle = await createNginxDomain({ dataDir: infra.dataDir });
const apiClientHandle = createApiClientDomain({ dataDir: infra.dataDir });

return {
  nginx: nginxHandle.service,
  apiClient: apiClientHandle.service,
};
```

```typescript
// server/app.ts（简化后）
await fastify.register(corePlugin);   // fastify.core 包含 nginx / apiClient
await fastify.register(wsPlugin);      // ws 使用 fastify.core.nginx
// 不再需要 nginxPlugin / apiClientPlugin
```

### 8.3 nginx binding 持久化

binding store 位于：
```txt
{dataDir}/nginx/binding.json
```

功能已从 server 迁移到 core composer：
- `savePersistedNginxPath(dataDir, path)`
- `clearPersistedNginxPath(dataDir)`

### 8.4 长期建议

nginx binding store 最终应下沉到：
```txt
packages/nginx/src/storage/nginx-binding.store.ts
```

让 nginx 领域能力自己维护自己的持久化状态。

---

## 9. server 适配层调用规则

server 是 Fastify 适配层，负责 HTTP / WS 暴露 core 能力。

**调用原则：**
```txt
server 只做路由和协议转换
server 不创建领域服务实例
server 通过 fastify.core 访问所有能力
```

**fastify.core vs fastify.nginx / fastify.api：**
- `fastify.core` 是主要访问入口
- `fastify.nginx` / `fastify.api` 是为保持向后兼容的装饰器声明（类型推导自 CoreApp）

**禁止事项：**
- server 禁止 new NginxApp() / new ApiClient()
- server 禁止创建领域服务实例
- server 的 plugin 只能做装饰器转发（fastify.decorate）

**正确模式：**
```typescript
// server/plugins/nginx.plugin.ts（已移除，现在直接用 corePlugin）
// fastify.decorate('nginx', fastify.core.nginx)

// server/routes/nginx/*.ts
const nginx = fastify.core.nginx;
```

---

## 更新日志

- 2026-04-29: 初始版本，沉淀四阶段架构重构成果