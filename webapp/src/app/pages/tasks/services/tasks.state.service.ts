import { Injectable, computed, effect, signal } from "@angular/core";
import { TaskLogLine, TaskRow, TaskRuntime, TaskRuntimeStatus } from "@models/task.model";
import { TasksApiService } from "./tasks-api.service";
import { TaskStreamService } from "./task-stream.service";
import { TaskRuntimeStore } from "./task-runtime-store";

type RunIndex = Record<string, string>; // taskId -> runId

@Injectable({ providedIn: "root" })
export class TaskStateService {
  // 当前项目id
  readonly projectId = signal<string>("");
  // 页面状态
  readonly keyword = signal<string>("");
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>("");
  // task 静态数据
  readonly rows = signal<TaskRow[]>([]);
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

  // 过滤后的列表数据：关键字搜索
  readonly filteredRows = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    const rows = this.rows();
    if (!kw) return rows;
    return rows.filter((r) => {
      const id = r.spec.id?.toLowerCase() ?? "";
      const name = r.spec.name?.toLowerCase() ?? "";
      return id.includes(kw) || name.includes(kw);
    });
  });

  /**
   * rowsView：把 spec +（runId + storeStatus）合成
   * 列表想展示 running/stopping，就用这个
   */
  readonly rowsView = computed(() => {
    const rows = this.rows();
    const idx = this.runIndex();

    return rows.map(r => {
      const taskId = r.spec.id;
      const runId = idx[taskId] || r.runtime?.runId || "";
      const st = runId ? this.runtimeStore.statusSignal(runId)() : { status: "idle" as const };

      return { ...r, ui: { runId, status: st.status } };
    });
  });

  constructor(
    private api: TasksApiService,
    private stream: TaskStreamService,
    private runtimeStore: TaskRuntimeStore,
  ) {
    // 订阅 WS 事件：维护索引（如果服务端 payload 带 taskId，则自动维护）
    this.stream.events$().subscribe((e) => {
      const taskId = String(e?.payload?.taskId ?? "").trim();
      if (!taskId) return; // 本版不强依赖 server 带 taskId

      if (e.type === "started" || (e.type === "snapshot" && e.payload?.status === "running")) {
        this.setActiveRun(taskId, e.runId);
      }

      if (e.type === "exited" || e.type === "failed" || (e.type === "snapshot" && (e.payload?.status === "stopped" || e.payload?.status === "failed" || e.payload?.status === "success"))) {
        this.clearActiveRun(taskId, e.runId);
      }
    });

    // selectedRunId -> 订阅 store 状态（单源）
    // effect((onCleanup) => {
    //   console.log('selectedRunId effect', this.selectedRunId());
    //   const runId = this.selectedRunId();
    //   if (!runId) {
    //     this.selectedRuntimeStatus.set({ status: "idle" });
    //     return;
    //   }

    //   const sub = this.runtimeStore.status$(runId).subscribe(st => {
    //     this.selectedRuntimeStatus.set(st);
    //   });

    //   onCleanup(() => sub.unsubscribe());
    // });

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
  setProject(projectId: string) {
    if (!projectId) return;
    if (this.projectId() === projectId) return;

    this.projectId.set(projectId);
    this.selectedTaskId.set("");
    this.selectedRunId.set("");
    this.keyword.set("");

    // 切项目：清空索引（避免串台）
    this.runIndex.set({});

    this.refresh();
  }

  refresh() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set("");

    this.api.refresh(pid).subscribe({
      next: (res) => {
        // 注意：后端可能仍返回 TaskRow.runtime 为 TaskRuntime
        // 这里把它“降级”为 runtimeRef（只保留 runId/lastExit…）
        const next: TaskRow[] = (res ?? []).map((r: any) => ({
          spec: r.spec,
          runtime: r.runtime ? {
            runId: r.runtime.runId,
            lastExitCode: r.runtime.exitCode,
            lastStoppedAt: r.runtime.stoppedAt
          } : undefined,
        }));

        this.rows.set(next);
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

  // private syncSelectedRunId() {
  //   const taskId = this.selectedTaskId();
  //   if (!taskId) {
  //     this.selectedRunId.set("");
  //     return;
  //   }

  //   const idx = this.runIndex();
  //   const active = idx[taskId];
  //   if (active) {
  //     this.selectedRunId.set(active);
  //     // 确保 WS 有订阅（不打开 console 也能更新状态）
  //     this.stream.ensureConnected();
  //     this.stream.subscribeRun(active, 200);
  //     return;
  //   }

  //   const row = this.rows().find(r => r.spec.id === taskId);
  //   const last = row?.runtime?.runId ?? "";
  //   this.selectedRunId.set(last);

  //   if (last) {
  //     this.stream.ensureConnected();
  //     this.stream.subscribeRun(last, 200);
  //   }
  // }

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
    console.log('toggleTask', this.isRunning(), this.isStopped(), this.isStopping());
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
    const rows = this.rows();
    const idx = rows.findIndex(r => r.spec.id === taskId);
    if (idx === -1) return;

    const next = rows.slice();
    next[idx] = {
      ...next[idx],
      runtime: { ...(next[idx].runtime ?? {}), runId },
    };
    this.rows.set(next);
  }
}
