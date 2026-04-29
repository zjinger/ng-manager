# Protocol 治理规范

> 本文档用于约束 `@yinuo-ngm/protocol` 的定位、依赖边界、类型命名、DTO 迁移方式与破坏性变更处理规则。
>
> 目标：让 protocol 成为 `server / webapp / core / domain packages` 之间稳定、清晰、可演进的契约层，而不是任意类型的堆放目录。

## 1. Protocol 定位与职责

`@yinuo-ngm/protocol` 是 ng-manager 的跨层协议契约包。

它主要承载：

- WebSocket 消息类型
- WebSocket topic / message envelope
- 事件 payload 类型
- HTTP request DTO
- HTTP response DTO
- 前后端共享的基础枚举、基础类型
- 错误响应、分页响应等通用协议结构

长期目标链路：

```txt
domain packages
  输出领域对象 / 领域事件 / 内部模型
        ↓
core
  组合领域能力，不直接关心 UI DTO
        ↓
server
  将领域对象映射为 protocol DTO
        ↓
protocol
  定义稳定的 HTTP / WS / Event / Common 契约
        ↓
webapp
  只消费 protocol DTO，不复制后端类型
```

`protocol` 的职责是定义契约，不负责实现业务逻辑。

## 2. 依赖边界规则

### Rule 1: protocol 不依赖领域包

`protocol` 不允许依赖以下包：

```txt
@yinuo-ngm/core
@yinuo-ngm/server
@yinuo-ngm/webapp
@yinuo-ngm/task
@yinuo-ngm/project
@yinuo-ngm/nginx
@yinuo-ngm/api
@yinuo-ngm/deps
@yinuo-ngm/svn
@yinuo-ngm/config
@yinuo-ngm/bootstrap
```

原则：

```txt
protocol 应尽量保持零业务包依赖。
```

允许的依赖应尽量控制在：

- TypeScript 类型自身
- 极少量无业务语义的基础工具类型

推荐方向：

```txt
领域包 → protocol
server → protocol
webapp → protocol
core → protocol
```

禁止方向：

```txt
protocol → 领域包
protocol → server
protocol → webapp
protocol → core
```

### 依赖边界原因

如果 `protocol` 依赖领域包，会导致：

1. 前端打包可能引入 Node 侧代码。
2. 协议层被领域实现污染。
3. DTO 与内部领域对象强耦合。
4. 后续协议版本化困难。

## 3. 领域包使用 protocol 的规则

### Rule 2: 领域包可以使用 event payload 和基础枚举

领域包允许从 `@yinuo-ngm/protocol` 引入：

- 事件 payload 类型
- WebSocket 事件 payload 类型
- 基础枚举
- 基础 ID 类型
- 与传输无关的轻量共享类型

示例：

```ts
import type { TaskStartedPayload } from "@yinuo-ngm/protocol";
```

### 领域包禁止使用 HTTP DTO

领域包不应依赖 HTTP request / response DTO。

不推荐：

```ts
import type { TaskListResponseDto } from "@yinuo-ngm/protocol";
```

原因：

```txt
HTTP DTO 属于 server 对外暴露协议，不属于领域服务内部模型。
```

领域包应该输出领域对象，由 server 负责转换成 DTO。

## 4. Server 层职责

### Rule 3: server 负责 DTO 映射

`server` 是协议适配层，负责完成：

```txt
domain object → protocol DTO
```

推荐链路：

```txt
HTTP Request
  ↓
server route
  ↓
core / domain service
  ↓
server mapper
  ↓
protocol DTO
  ↓
HTTP Response
```

### server 不应直接暴露内部领域对象

不推荐：

```ts
const runtime = await fastify.core.task.getRuntime(id);
return reply.send(runtime);
```

推荐：

```ts
const runtime = await fastify.core.task.getRuntime(id);
return reply.send(toTaskRuntimeDto(runtime));
```

### Mapper 位置规范

建议将 DTO 映射逻辑放在：

```txt
packages/server/src/mappers/
  task.mapper.ts
  project.mapper.ts
  nginx.mapper.ts
  config.mapper.ts
```

不建议将大量字段转换逻辑散落在 route handler 中。

## 5. Webapp 层职责

### Rule 4: webapp 只消费 protocol，不反向依赖领域包

`webapp` 可以依赖 `@yinuo-ngm/protocol`，但应以 type-only 方式使用。

推荐：

```ts
import type { WsServerMsg, TaskRuntimeDto } from "@yinuo-ngm/protocol";
```

不推荐：

```ts
import type { TaskRuntime } from "@yinuo-ngm/task";
import type { CoreApp } from "@yinuo-ngm/core";
import type { NginxApp } from "@yinuo-ngm/nginx";
```

禁止 webapp 直接依赖：

```txt
@yinuo-ngm/core
@yinuo-ngm/server
@yinuo-ngm/task
@yinuo-ngm/project
@yinuo-ngm/nginx
@yinuo-ngm/api
@yinuo-ngm/deps
@yinuo-ngm/svn
```

原因：

1. 这些包可能包含 Node 侧依赖。
2. 它们是实现包，不是前端协议契约。
3. 会破坏 UI 与本地能力层之间的边界。

## 6. HTTP DTO 迁移规范

HTTP DTO 不要求一次性全部迁移，应按模块逐步推进。

推荐顺序：

```txt
1. task
2. project
3. nginx
4. config
5. deps
6. api
7. sprite
8. svn
```

每个模块在 protocol 中建立独立目录：

```txt
packages/protocol/src/task/
  index.ts
  task-request.dto.ts
  task-response.dto.ts
  task-runtime.dto.ts
```

### Request DTO

请求体类型使用 `RequestDto` 后缀：

```ts
export interface StartTaskRequestDto {
  projectId: string;
  taskName: string;
}
```

### Response DTO

响应体类型使用 `ResponseDto` 后缀：

```ts
export interface StartTaskResponseDto {
  taskId: string;
  status: string;
}
```

### 数据对象 DTO

普通数据对象使用 `Dto` 后缀：

```ts
export interface TaskRuntimeDto {
  id: string;
  projectId: string;
  name: string;
  status: "idle" | "running" | "exited" | "failed";
}
```

### Server mapper 规则

每个 HTTP DTO 迁移应配套 server mapper：

```txt
packages/server/src/mappers/task.mapper.ts
```

示例：

```ts
export function toTaskRuntimeDto(runtime: TaskRuntime): TaskRuntimeDto {
  return {
    id: runtime.id,
    projectId: runtime.projectId,
    name: runtime.name,
    status: runtime.status,
  };
}
```

## 7. 协议类型命名约定

### DTO 命名

| 类型 | 后缀 | 示例 |
|---|---|---|
| HTTP 请求体 | `RequestDto` | `CreateProjectRequestDto` |
| HTTP 响应体 | `ResponseDto` | `CreateProjectResponseDto` |
| 普通传输对象 | `Dto` | `ProjectDto` |
| 分页响应 | `PageResponseDto` | `ProjectPageResponseDto` |
| 错误响应 | `ErrorDto` | `ApiErrorDto` |
| WebSocket 消息 | `Msg` | `WsServerMsg` |
| 事件 payload | `Payload` | `TaskStartedPayload` |

### 字段命名

统一使用 camelCase：

```ts
export interface ProjectDto {
  projectId: string;
  projectName: string;
  createdAt: string;
}
```

不使用 snake_case：

```ts
// 不推荐
created_at: string;
```

### 时间字段

跨层协议中的时间字段允许使用 epoch number 或 ISO string，必须沿用当前模块已有语义，并在同一模块内保持一致。

推荐约定：

```ts
// 绝对时间，若模块已有 number 语义，通常表示 epoch milliseconds
startedAt: number;
endedAt: number;

// 持续时间，通常使用 milliseconds
_durationMs: number;
```

```ts
// 新增 HTTP DTO 若没有历史兼容要求，可优先使用 ISO string
createdAt: string;
updatedAt: string;
```

不要在 DTO 中使用 `Date` 对象。

禁止为了统一格式而直接修改既有字段类型，例如将已有的 `ts: number`、`startedAt: number` 改成 ISO string。此类修改属于 breaking change。

### 可选字段

可缺省字段使用 `?`：

```ts
pid?: number;
exitCode?: number;
```

不要使用 `null` 表示普通缺省，除非业务语义明确需要区分 `null` 与 `undefined`。

## 8. WebSocket / Event 类型规范

### 当前 WS 协议形态

当前实现以 `op` 区分不同 WebSocket 消息，并通过联合类型描述服务端与客户端消息。协议中已支持可选 `version` 字段注入。

文档与代码应以当前 `op-union` 模型为准，新增 WS 消息时应扩展现有联合类型，而不是直接引入新的 envelope 结构。

示意：

```ts
export type WsServerMsg =
  | { op: "log"; line: LogLine; version?: string }
  | { op: "task.event"; event: unknown; version?: string }
  | { op: "svn.event"; event: unknown; version?: string };
```

### 长期演进方向

长期可以评估将 WS 消息演进为统一 envelope：

```ts
export interface WsEnvelope<T = unknown> {
  topic: WsTopic;
  type: string;
  payload: T;
  timestamp?: number;
  version?: string;
}
```

但该模型属于长期目标，不能直接替代现有 `op-union` 协议。

迁移策略应遵循：

1. 先保留现有 `op-union` 消息类型。
2. 新增 envelope 类型作为并行协议，而不是覆盖原类型。
3. server 同时发送或兼容两种格式。
4. webapp 完成兼容处理后，再标记旧格式 deprecated。
5. 保留至少一个小版本周期后，再考虑移除旧格式。

### Event payload 规则

事件 payload 应由 protocol 定义，领域包引用。

推荐：

```txt
packages/protocol/src/event/
  task-event.types.ts
  svn-event.types.ts
  nginx-event.types.ts
  project-event.types.ts
  bootstrap-event.types.ts
  system-event.types.ts
```

core 中的 EventMap 应组合领域事件，而不是重复声明 payload：

```ts
export type CoreEventMap =
  & CoreOwnEventMap
  & TaskEventMap
  & SvnEventMap
  & BootstrapEventMap;
```

## 9. Breaking Change 处理

以下行为属于 breaking change：

1. 删除已导出的 DTO。
2. 修改已导出字段名称。
3. 修改字段类型且不兼容。
4. 将可选字段改为必填字段。
5. 将必填字段改为可选字段通常是向后兼容的，但如果 server / webapp 依赖该字段必定存在，仍需要按兼容性风险评审。
6. 修改 WebSocket topic、op 或 event type 字符串。
7. 修改 HTTP response 的顶层结构。

### 安全修改方式

推荐新增字段，而不是修改已有字段：

```ts
export interface ProjectDto {
  id: string;
  name: string;
  displayName?: string; // 新增字段，兼容旧调用方
}
```

需要废弃字段时，先标记 deprecated：

```ts
export interface ProjectDto {
  id: string;
  /** @deprecated use displayName instead */
  name: string;
  displayName?: string;
}
```

### 删除字段流程

删除字段应遵循：

```txt
1. 标记 deprecated
2. server 同时返回新旧字段
3. webapp 迁移到新字段
4. 保留至少一个小版本周期
5. 最后删除旧字段
```

### WebSocket 事件变更

不要直接修改已有事件名。

不推荐：

```txt
task.started → task.start
```

推荐新增事件：

```txt
task.started.v2
```

或者保持事件名不变，只在 payload 中新增兼容字段。

## 10. 目录结构建议

长期目标结构：

```txt
packages/protocol/src/
  index.ts

  common/
    index.ts
    page.types.ts
    result.types.ts
    error.types.ts
    id.types.ts

  ws/
    index.ts
    message.types.ts
    topic.types.ts
    log.types.ts

  event/
    index.ts
    task-event.types.ts
    svn-event.types.ts
    nginx-event.types.ts
    project-event.types.ts
    bootstrap-event.types.ts
    system-event.types.ts

  http/
    index.ts
    common-response.types.ts

  task/
    index.ts
    task-runtime.dto.ts
    task-request.dto.ts
    task-response.dto.ts

  project/
    index.ts
    project.dto.ts
    project-request.dto.ts
    project-response.dto.ts

  config/
    index.ts
    config.dto.ts

  nginx/
    index.ts
    nginx.dto.ts
    nginx-request.dto.ts
    nginx-response.dto.ts

  api/
    index.ts
    api-debug.dto.ts
    api-request.dto.ts
    api-response.dto.ts
```

当前阶段不要求一次性完成该结构，应按模块逐步迁移。

## 11. 类型进入 protocol 的判断标准

允许进入 protocol：

- HTTP request DTO
- HTTP response DTO
- WebSocket message 类型
- WebSocket payload 类型
- Event payload 类型
- 前后端共享基础枚举
- 分页、错误、请求 ID 等通用协议类型

不允许进入 protocol：

- Repository entity
- 数据库行类型
- CoreApp 内部类型
- server route context
- domain service 实现类
- 仅某个包内部使用的临时类型
- Electron 专属类型
- Angular component view model

判断原则：

```txt
只有跨边界传输、跨包消费、需要稳定契约的类型，才进入 protocol。
```

## 12. 执行建议

Protocol 强化建议分阶段推进：

```txt
Phase 1: WS / Event payload 稳定化
Phase 2: webapp type-only 接入 protocol
Phase 3: task HTTP DTO 试点
Phase 4: 按模块迁移 HTTP DTO，包括 project / nginx / config / deps / api / sprite / svn 等
Phase 5: 协议版本化与破坏性变更治理
```

每个阶段必须满足：

1. `npm run build` 通过。
2. 不引入 protocol → domain 的反向依赖。
3. webapp 不引入 Node 侧实现包。
4. server mapper 负责领域对象到 DTO 的转换。

## 13. 一句话原则

```txt
protocol 管契约，domain 管能力，core 管装配，server 管适配，webapp 管呈现。
```
