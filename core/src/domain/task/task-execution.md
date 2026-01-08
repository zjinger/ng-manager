# Task Execution & Logging Design
> ng-manager2.0 · Task 执行与日志系统设计说明（一期）

## 1. 设计目标

- 提供**稳定、可控、可观测**的任务执行能力
- 保证 **Local-first**：任务执行、日志、状态均在本地完成
- 提供接近 **Terminal** 的输出体验（实时滚动、高亮）
- 明确区分 **任务日志（Task Output）** 与 **系统日志（System Log）**
- 降低复杂度：一期 **同一 task 不支持并发运行**

---

## 2. 核心约束（已冻结）

### 2.1 Task 并发规则
- **同一 taskId 在任一时刻仅允许一个运行实例**
- 若 task 已在运行，再次 run 将被拒绝

> 该约束为 **core 级别规则**，不能仅由 UI 或 server 保障。

---

### 2.2 runId 规则
- 每次任务执行都会生成一个唯一的 `runId`
- 即使同一 task 不支持并发，`runId` 仍然是：
  - 任务执行生命周期的唯一标识
  - WebSocket 订阅的主键
  - stop 行为的控制对象
  - 日志（syslog / task log）串联的关键字段

---

## 3. 核心概念定义

### 3.1 TaskDefinition（任务定义）
- 来源：project 的 scripts（如 package.json）
- 稳定存在，不随执行变化

字段示意：
- `taskId`
- `projectId`
- `name`
- `command`
- `cwd`
- `shell`

---

### 3.2 TaskRun（任务运行实例）
- 表示某一次具体的任务执行
- 生命周期短暂，但可被回溯

字段示意：
- `runId`
- `taskId`
- `projectId`
- `status`: idle | running | stopping | success | failed | stopped
- `startTs`
- `endTs`
- `exitCode?`
- `signal?`

---

## 4. Task 行为定义

### 4.1 run 行为
执行流程（强制顺序）：

1. 校验 task 是否存在
2. 检查该 taskId 是否已有 running 的 run
3. 若存在：
   - 拒绝执行
   - 返回错误：`TASK_ALREADY_RUNNING`
   - 写系统日志：`task.run.rejected`
4. 若不存在：
   - 生成 `runId`
   - 写系统日志：`task.run.requested`
   - 启动子进程
   - 写系统日志：`task.run.started`

---

### 4.2 stop 行为
- stop 必须 **基于 runId**
- 执行策略：
  1. 尝试 graceful terminate
  2. 超时后 force kill
- 结果必须明确：
  - terminated
  - killed
  - already-exited
  - not-found

---

### 4.3 rerun 行为
- 本质是一次新的 run
- 会生成新的 runId
- 不复用历史 run

---

## 5. 日志系统设计

### 5.1 日志分类原则

#### 系统日志（System Log）
> 记录 **用户行为 / 系统动作 / 结果**

- 全局日志
- 结构化
- 不包含任务 stdout / stderr

#### 任务日志（Task Log）
> 记录 **任务执行过程中的输出**

- 与 runId 强绑定
- 包含 stdout / stderr / 状态事件
- 支持回放（ring buffer）

---

### 5.2 System Log 规范

支持的 action（一期）：

| action | level | 说明 |
|---|---|---|
| task.run.requested | info | 用户请求执行任务 |
| task.run.started | info | 任务成功启动 |
| task.run.rejected | warn | 任务已在运行 / 校验失败 |
| task.stop.requested | info | 用户请求停止 |
| task.stop.done | info | 停止完成 |
| task.error | error | 执行期间内部错误 |

---

#### System Log 数据结构（示意）

```ts
type SystemLogEvent = {
  id: string
  ts: number
  level: "info" | "warn" | "error"
  action: string
  projectId?: string
  taskId?: string
  runId?: string
  message: string
  meta?: Record<string, any>
}
```

---

## 6. Task Output（任务日志）设计

### 6.1 输出单位
- **以 chunk 为单位推送**
- 保留原始内容（不强制按行）
- 支持 stdout / stderr 区分

### 6.2 存储策略
- 每个 runId 维护一个 ring buffer
- 仅保存最近 N KB / N 行
- 用于：
  - WS 重连
  - 页面刷新后的回放

---

## 7. WebSocket 协议设计（一期）

### 7.1 Client → Server

```ts
{ op: "sub", topic: "task", runId: string, tail?: number }
{ op: "unsub", topic: "task", runId: string }
{ op: "sub", topic: "syslog", tail?: number }
{ op: "unsub", topic: "syslog" }
```

---

### 7.2 Server → Client

```ts
{
  op: "task.output",
  runId: string,
  stream: "stdout" | "stderr",
  chunk: string
}

{
  op: "task.event",
  runId: string,
  status: "started" | "stopped" | "success" | "failed",
  exitCode?: number,
  signal?: string
}

{
  op: "syslog.append",
  event: SystemLogEvent
}
```

---

## 8. UI 终端体验设计

### 8.1 一期能力
- 实时滚动输出
- stdout / stderr 视觉区分
- ANSI 颜色支持
- 支持复制 / 清屏

### 8.2 推荐技术选型
- **xterm.js**
- 可选：xterm-addon-fit / xterm-addon-web-links

---

## 9. Task 状态机

```
idle
  └─ run → running
running
  ├─ stop → stopping → stopped
  ├─ exit(0) → success
  └─ exit(!0) → failed
(success / failed / stopped)
  └─ run → running（新 runId）
```

---

## 10. 模块职责边界

### Core
- TaskRunner
- TaskLogStore（ring buffer）
- SystemLogService
- EventBus

### Server
- HTTP：run / stop / list
- WS：订阅管理、事件转发

### WebApp
- TerminalPanel
- SystemLogPanel

---

## 11. 一期验收标准（DoD）

- 同一 task 不可并发运行
- run / stop 行为可控、可观测
- task 输出实时推送、支持高亮
- 系统日志实时推送、结构化
- 页面刷新可回放最近输出
- 任务结束状态明确（success / failed / stopped）
