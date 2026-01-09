import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { TaskItemVM, TaskLogLine, TaskRow, TaskRuntime, TaskRuntimeStatus, TaskSnapshotPayload } from "@models/task.model";
import { TaskCatalogService } from "./task-catalog.service";
import { TaskRuntimeStore } from "./task-runtime-store";
import { TaskStreamService } from "./task-stream.service";
import { TasksApiService } from "./tasks-api.service";

type RunIndex = Record<string, string>; // taskId -> runId

@Injectable({ providedIn: "root" })
export class TaskStateService {
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private runtimeStore = inject(TaskRuntimeStore);
  private catalog = inject(TaskCatalogService);
  // 当前项目id
  readonly projectId = signal<string>("");
  // 页面状态
  readonly keyword = signal<string>("");
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>("");
  // task 数据
  // rows 从 catalog 读（同一份数据给 popover 和页面）
  readonly rows = computed<TaskRow[]>(() => {
    const pid = this.projectId();
    if (!pid) return [];
    return this.catalog.rowsOf(pid)();
  });
  readonly selectedTaskId = signal<string>("");

  // log
  readonly logOpen = signal(false);
  readonly logLines = signal<TaskLogLine[]>([]);
  readonly logLoading = signal(false);

  // mapping: taskId -> active runId（单源索引）
  private readonly runIndex = signal<RunIndex>({});

  // selection
  readonly selectedRunId = signal<string>("");

  // selected runtime status (from store)
  readonly selectedRuntimeStatus = signal<TaskRuntimeStatus>({ status: "idle" });

  // computed helpers
  // 当前选中行
  readonly selectedRow = computed(() => {
    const id = this.selectedTaskId();
    if (!id) return null;
    return this.rows().find(r => r.spec.id === id) ?? null;
  });

  readonly selectedSpec = computed(() => this.selectedRow()?.spec ?? null);

  readonly isRunning = computed(() => this.selectedRuntimeStatus().status === "running");
  readonly isStopping = computed(() => this.selectedRuntimeStatus().status === "stopping");
  readonly isStopped = computed(() => this.selectedRuntimeStatus().status === "stopped" || this.selectedRuntimeStatus().status === "idle");
  readonly isDisabled = computed(() => {
    const spec = this.selectedSpec();
    if (!spec) return true;
    return spec.runnable === false;
  });

  private rowsViewOfCache = new Map<string, () => TaskRow[]>();

  readonly listVM = computed<TaskItemVM[]>(() => {
    const kw = this.keyword().trim().toLowerCase();
    const rows = this.rows();

    const mapped = rows.map((r) => {
      const runId = this.runIdOfRow(r);
      const status = this.statusOfRow(r);
      return { spec: r.spec, runtime: r.runtime, runId, status };
    });

    if (!kw) return mapped;

    return mapped.filter((t) => {
      const id = t.spec.id?.toLowerCase() ?? "";
      const name = t.spec.name?.toLowerCase() ?? "";
      const runId = t.runId?.toLowerCase() ?? "";
      const status = t.status?.toLowerCase() ?? "";
      return id.includes(kw) || name.includes(kw) || runId.includes(kw) || status.includes(kw);
    });
  });

  constructor() {
    // 订阅 WS 事件：维护索引（如果服务端 payload 带 taskId，则自动维护）
    this.stream.events$().subscribe((e) => {
      const taskId = String(e?.payload?.taskId ?? "").trim();
      if (!taskId) return; // 本版不强依赖 server 带 taskId

      if (e.type === "started" || (e.type === "snapshot" && (e.payload as TaskSnapshotPayload)?.status === "running")) {
        this.setActiveRun(taskId, e.runId);
      }

      if (e.type === "exited" || e.type === "failed" || (e.type === "snapshot" && (e.payload as TaskSnapshotPayload)?.status === "stopped" || (e.payload as TaskSnapshotPayload)?.status === "failed" || (e.payload as TaskSnapshotPayload)?.status === "success")) {
        this.clearActiveRun(taskId, e.runId);
      }
    });

    effect((onCleanup) => {
      const runId = this.selectedRunId();
      // console.log("selectedRunId effect", runId);
      // 没选中：状态回 idle
      if (!runId) {
        this.selectedRuntimeStatus.set({ status: "idle" });
        this.clearLog();
        return;
      }

      // 订阅 WS（唯一入口）
      this.stream.ensureConnected();
      this.stream.subscribeRun(runId, 200);

      // 订阅 store 状态（唯一入口）
      const sub = this.runtimeStore.status$(runId).subscribe((st) => {
        this.selectedRuntimeStatus.set(st);
      });

      onCleanup(() => {
        sub.unsubscribe();
        // 切换 runId / 组件销毁时，退订旧 run（避免重复与串台）
        this.stream.unsubscribeRun(runId);
      });
    });
  }

  /** 页面切换项目时调用 */
  async setProject(projectId: string) {
    const pid = (projectId ?? "").trim();
    if (!pid) return;
    if (this.projectId() === pid) return;

    this.projectId.set(pid);
    this.selectedTaskId.set("");
    this.selectedRunId.set("");
    this.keyword.set("");
    // 切项目：清空索引
    this.runIndex.set({});
    // 确保 catalog 已加载
    await this.catalog.ensureLoaded(pid);
    // 首次选中第一条
    const rows = this.rows();
    const first = rows[0];
    if (first) this.select(first.spec.id);
  }

  /**
  * tasks 页面“刷新”按钮/进入页面时调用 
  */
  refresh() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set("");

    this.api.refresh(pid).subscribe({
      next: (res) => {
        // 注意：后端可能仍返回 TaskRow.runtime 为 TaskRuntime
        // 这里把它“降级”为 runtimeRef（只保留 runId/lastExit…）
        const next: TaskRow[] = (res ?? []).map((r: TaskRow) => ({
          spec: r.spec,
          runtime: r.runtime ? {
            taskId: r.runtime.taskId,
            projectId: r.runtime.projectId,
            runId: r.runtime.runId,
            status: r.runtime.status,
            lastExitCode: r.runtime.exitCode,
            lastStoppedAt: r.runtime.stoppedAt
          } : undefined
        }));
        // 写回 catalog（统一数据源）
        this.catalog.setRows(pid, next);

        this.loading.set(false);

        if (!this.selectedTaskId()) {
          const first = next[0];
          if (first) this.select(first.spec.id);
        } else {
          if (!next.some(v => v.spec.id === this.selectedTaskId())) {
            this.selectedTaskId.set("");
            this.selectedRunId.set("");
          } else {
            // 保持当前选中 task 的 runId 同步
            this.syncSelectedRunId();
          }
        }
        this.rehydrateFromViews(pid);
      },
      error: (err) => {
        this.error.set(err?.message || String(err));
        this.loading.set(false);
      },
    });
  }

  select(taskId: string) {
    this.selectedTaskId.set(taskId);
    this.syncSelectedRunId();
  }

  private syncSelectedRunId() {
    const taskId = this.selectedTaskId();
    if (!taskId) {
      this.selectedRunId.set("");
      return;
    }

    const idx = this.runIndex();
    const active = idx[taskId];
    if (active) {
      this.selectedRunId.set(active);
      return;
    }

    const row = this.rows().find(r => r.spec.id === taskId);
    const last = row?.runtime?.runId ?? "";
    this.selectedRunId.set(last);
  }

  toggleTask() {
    if (this.isRunning()) this.stopSelected();
    else this.startSelected();
  }

  startSelected() {
    const spec = this.selectedSpec();
    if (!spec) return;

    this.api.start(spec.id).subscribe({
      next: (rt: TaskRuntime) => {
        // 只做索引 & 订阅，不再用 HTTP rt.status 更新 UI
        this.setActiveRun(rt.taskId, rt.runId);
        this.selectedRunId.set(rt.runId);

        this.stream.ensureConnected();
        this.stream.subscribeRun(rt.runId, 200);

        // rows 里只记“最近 runId”（可选）
        this.touchRowRuntimeRef(rt.taskId, rt.runId);
      },
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  stopSelected() {
    const runId = this.selectedRunId();
    if (!runId) return;
    // 标记为 stopping
    this.runtimeStore.set(runId, { status: "stopping" });
    this.api.stop(runId).subscribe({
      next: () => {
        // 不做 upsertRuntime，等 WS 的 stopRequested/exited 来最终落地
      },
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  closeLog() {
    this.logOpen.set(false);
  }

  clearLog() {
    this.logLines.set([]);
  }

  private setActiveRun(taskId: string, runId: string) {
    const id = String(taskId ?? "").trim();
    const r = String(runId ?? "").trim();
    if (!id || !r) return;
    const next = { ...this.runIndex() };
    next[id] = r;
    this.runIndex.set(next);
  }

  private clearActiveRun(taskId: string, runId?: string) {
    const id = String(taskId ?? "").trim();
    if (!id) return;
    const cur = this.runIndex();
    if (!cur[id]) return;
    // 如果传了 runId，则只在匹配时清（避免旧 runId 覆盖新 runId）
    if (runId && cur[id] !== runId) return;
    const next = { ...cur };
    delete next[id];
    this.runIndex.set(next);

    if (this.selectedTaskId() === id) {
      // 选中 task 的 active run 清掉，回退到 rows 里 last run
      this.syncSelectedRunId();
    }
  }

  private touchRowRuntimeRef(taskId: string, runId: string) {
    const pid = this.projectId();
    if (!pid) return;

    const rows = this.rows();
    const idx = rows.findIndex((r) => r.spec.id === taskId);
    if (idx === -1) return;
    const next = rows.slice();
    next[idx] = {
      ...next[idx],
      runtime: { ...(next[idx].runtime ?? {}), runId } as TaskRuntime,
    };
    this.catalog.setRows(pid, next);
  }

  /** 刷新/重载后：用后端 views 快照重建 runIndex + runtimeStore */
  private rehydrateFromViews(projectId: string) {
    const pid = (projectId ?? "").trim();
    if (!pid) return;

    this.api.getViews(pid).subscribe({
      next: (views) => {
        const list = (views ?? []) as TaskRow[];

        for (const r of list) {
          const taskId = String(r?.spec?.id ?? "").trim();
          const rt = r?.runtime;
          const runId = String(rt?.runId ?? "").trim();
          const status = String(rt?.status ?? "").trim();

          if (!taskId || !runId) continue;

          // 1) 把运行中的 run 写回 runIndex
          if (status === "running" || status === "stopping") {
            this.setActiveRun(taskId, runId);
          }

          // 2) 把状态写入 runtimeStore（让 statusSignal(runId)() 有值）
          if (status) {
            this.runtimeStore.set(runId, { status: status as TaskRuntimeStatus["status"] });
          }

          // 3) 重新订阅 ws，保证后续状态/日志还能更新
          if (status === "running" || status === "stopping") {
            this.stream.ensureConnected();
            this.stream.subscribeRun(runId, 200);
          }
          // 4) rows 里保留 last runId（可选：你 fallback 的 r.runtime?.runId 也对）
          this.touchRowRuntimeRef(taskId, runId);
        }
        // 如果当前选中的 task 受影响，同步一下选中 runId
        this.syncSelectedRunId();
      },
      error: (err) => {
        // 不要让页面挂掉，最多只是不显示 running
        console.warn("rehydrateFromViews failed:", err?.message || err);
      },
    });
  }

  /**
   * popover 用：确保某 projectId 的 tasks 已加载
   * 不改变当前 tasks 页选择
   */
  async ensureProjectLoaded(projectId: string) {
    const pid = (projectId ?? "").trim();
    if (!pid) return;
    await this.catalog.ensureLoaded(pid);
    this.hydrateFromRows(this.catalog.rowsOf(pid)());
  }

  private hydrateFromRows(rows: TaskRow[]) {
    for (const r of rows ?? []) {
      const rt = r.runtime;
      if (!rt) continue;
      const runId = (rt?.runId ?? "").trim();
      if (!runId) continue;

      // running/stopping：建立 active 索引
      if (rt.status === "running" || rt.status === "stopping") {
        this.setActiveRun(r.spec.id, runId);
        this.stream.ensureConnected();
        this.stream.subscribeRun(runId, 200);
      }
      // 写入 store：避免初始 idle
      const st =
        rt.status === "running"
          ? { status: "running", pid: rt.pid, startedAt: rt.startedAt }
          : rt.status === "stopping"
            ? { status: "stopping" }
            : (rt.status === "stopped" || rt.status === "success" || rt.status === "failed")
              ? { status: "stopped", exitCode: rt.exitCode, signal: rt.signal, stoppedAt: rt.stoppedAt }
              : { status: "idle" };

      this.runtimeStore.set(runId, st as TaskRuntimeStatus);
    }
  }
  /**
  * popover 用：直接拿某 projectId 的 rowsView
  */
  listVMOf(projectId: string) {
    return computed<TaskItemVM[]>(() => {
      const pid = (projectId ?? "").trim();
      if (!pid) return [];
      const rows = this.catalog.rowsOf(pid)();
      return rows.map((r) => {
        const runId = this.runIdOfRow(r);
        const status = this.statusOfRow(r);
        return { spec: r.spec, runtime: r.runtime, runId, status };
      });
    });
  }

  /**
  * popover 用：打开某 projectId 下的某 taskId
  */
  async openTask(projectId: string, taskId: string) {
    const pid = (projectId ?? "").trim();
    const tid = (taskId ?? "").trim();
    if (!pid || !tid) return;

    await this.setProject(pid);  // 会 ensureLoaded + 初选
    this.select(tid);            // 覆盖成指定 task
    // 可选：确保该任务 runId 的订阅已建立（不强制）
    this.syncSelectedRunId();
  }

  /** popover 用：启动某任务 */
  startTask(taskId: string) {
    const tid = (taskId ?? "").trim();
    if (!tid) return;

    this.api.start(tid).subscribe({
      next: (rt) => {
        this.setActiveRun(rt.taskId, rt.runId);
        this.runtimeStore.set(rt.runId, { status: "running", pid: rt.pid, startedAt: rt.startedAt });
        this.stream.ensureConnected();
        this.stream.subscribeRun(rt.runId, 200);
        this.touchRowRuntimeRef(rt.taskId, rt.runId);
      },
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  /** popover 用：停止某运行中的任务 */
  stopRun(runId: string) {
    const rid = (runId ?? "").trim();
    if (!rid) return;

    this.runtimeStore.set(rid, { status: "stopping" });
    this.api.stop(rid).subscribe({
      next: () => { },
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  private runIdOfRow(r: TaskRow): string {
    const taskId = r.spec.id;
    const idx = this.runIndex();
    return (idx[taskId] || r.runtime?.runId || "").trim();
  }

  private statusOfRow(r: TaskRow): TaskRuntimeStatus["status"] {
    const runId = this.runIdOfRow(r);
    if (runId) {
      // store 优先（WS 驱动）
      const st = this.runtimeStore.statusSignal(runId)();
      if (st?.status) return st.status;
    }
    // store 没有时，用后端 runtime 快照兜底
    const rs = r.runtime?.status;
    if (!rs) return "idle";
    if (rs === "running") return "running";
    if (rs === "stopping") return "stopping";
    if (rs === "stopped" || rs === "success" || rs === "failed") return "stopped";
    return "idle";
  }
}
