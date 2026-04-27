# WebSocket Protocol v0.2 (Task Execution & Syslog)

> **Status**: Draft (Recommended for ng-manager2.0 v0.2)
>
> This document defines the WebSocket protocol between **server** and **webapp**
> for task execution streaming and system logs.
>
> Goals:
> - Support **runId-based task execution sessions**
> - Separate **task output (terminal)** from **system logs (syslog)**
> - Ensure correct **stop semantics** (stopRequested -> exited)
> - Be backward-compatible with v0.1 (taskId-based)

---

## 1. Concepts

### 1.1 Task vs Run

- **Task**: A logical definition derived from project scripts
  Identified by `taskId` (== `spec.id`)

- **Run**: A single execution instance of a task
  Identified by **`runId`** (generated on every `start`)

> A task can have multiple runs over time (even if concurrency is disallowed).

---

### 1.2 Log Types

| Type        | Purpose                           | Scope      |
|-------------|-----------------------------------|------------|
| Task Output | stdout / stderr stream (terminal) | per runId  |
| Syslog      | system actions (run / stop / error) | global   |

---

## 2. Topics

```ts
export type WsTopic =
  | "task"     // task execution stream (by runId)
  | "syslog";  // global system log
```

---

## 3. Client -> Server Messages

### 3.1 Common

```ts
{ op: "ping" }
```

---

### 3.2 Subscribe

#### Task (by runId)

```ts
{
  op: "sub";
  topic: "task";
  runId: string;
  tail?: number; // optional, default 0
}
```

> Compatibility (v0.1):
> - `{ taskId }` MAY be accepted temporarily
> - Server SHOULD prefer runId if both exist

#### Syslog

```ts
{
  op: "sub";
  topic: "syslog";
  tail?: number; // optional
}
```

---

### 3.3 Unsubscribe

```ts
{
  op: "unsub";
  topic: "task";
  runId: string;
}
```

```ts
{
  op: "unsub";
  topic: "syslog";
}
```

---

## 4. Server -> Client Messages

### 4.1 Handshake / Control

```ts
{ op: "hello"; connId: string; ts: number }
{ op: "pong"; ts: number }
```

```ts
{
  op: "error";
  code: string;
  message: string;
  details?: any;
  ts: number;
  fatal?: boolean;
}
```

---

### 4.2 Task Output (Terminal Stream)

```ts
{
  op: "task.output";
  runId: string;
  stream: "stdout" | "stderr";
  chunk: string;
  ts: number;
}
```

Characteristics:
- Ordered by server emission
- Written directly into terminal (e.g. xterm.js)
- No system-level messages included

---

### 4.3 Task Events (Lifecycle)

```ts
{
  op: "task.event";
  runId: string;
  type:
    | "snapshot"
    | "started"
    | "stopRequested"
    | "exited"
    | "failed";
  payload: any;
  ts: number;
}
```

#### Event Semantics

| type          | Meaning |
|---------------|---------|
| snapshot      | Initial state after subscribe |
| started       | Process spawned successfully |
| stopRequested | Stop requested (SIGTERM sent) |
| exited        | Process exited (final state) |
| failed        | Spawn or runtime failure |

> UI MUST treat `stopRequested` as **stopping**, not stopped.

---

### 4.4 Syslog (System Actions)

```ts
{
  op: "syslog.append";
  entry: LogLine;
}
```

`LogLine` (from protocol):

```ts
{
  ts: number;
  level: "info" | "warn" | "error";
  source: "system";
  refId?: string; // usually runId or taskId
  text: string;
  data?: any;
}
```

Examples:
- `[task] run requested`
- `[task] stop requested`
- `[task] exited with code=1`

---

## 5. Stop Semantics (IMPORTANT)

Stopping a task is **two-phase**:

1. **stopRequested**
   - User requested stop
   - SIGTERM sent
   - UI state: `stopping`

2. **exited**
   - Process actually terminated
   - Final status determined:
     - success (code === 0)
     - failed (code !== 0)
     - stopped (signal)

UI MUST NOT treat stopRequested as final.

---

## 6. Reconnection Rules

- Client SHOULD automatically reconnect
- After reconnect:
  - Client SHOULD re-send all active subscriptions
  - Server SHOULD re-send `snapshot` on re-subscribe

---

## 7. Backward Compatibility (v0.1)

Temporary support MAY include:

```ts
// Deprecated
{ op: "log"; taskId: string; entry: any }
{ op: "status"; taskId: string; event: string; payload: any }
```

Migration plan:
1. Introduce new ops alongside old ones
2. Frontend switches to new ops
3. Remove deprecated ops in v0.3

---

## 8. Summary

- **runId is the primary execution identifier**
- Task output and syslog are strictly separated
- Stop is a two-phase operation
- Protocol is extensible for future topics (git / proxy / ai)

This protocol is designed to be:
- Local-first
- Deterministic
- Easy to reason about in UI and server code
