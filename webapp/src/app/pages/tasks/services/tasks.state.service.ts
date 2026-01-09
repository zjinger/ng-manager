import { Injectable, Signal, computed, effect, inject, signal } from "@angular/core";
import { TaskRow, TaskRuntime, TaskRuntimeStatus, TaskSnapshotPayload } from "@models/task.model";
import { TasksApiService } from "./tasks-api.service";
import { TaskStreamService } from "./task-stream.service";
import { TaskRuntimeStore } from "./task-runtime-store";
import { TaskCatalogService } from "./task-catalog.service";

type RunIndex = Record<string, string>; // taskId -> active runId

@Injectable({ providedIn: "root" })
export class TaskStateService {
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private runtimeStore = inject(TaskRuntimeStore);
  private catalog = inject(TaskCatalogService);

  /* ---------------- 基础状态 ---------------- */

  readonly projectId = signal<string>("");

  readonly keyword = signal("");
  readonly loading = signal(false);
  readonly error = signal("");

  readonly selectedTaskId = signal<string>("");
  readonly selectedRunId = signal<string>("");

  /** 唯一运行态索引 */
  private readonly runIndex = signal<RunIndex>({});

  /** 当前项目 rows（spec + runtime 快照） */
  readonly rows = computed<TaskRow[]>(() => {
    const pid = this.projectId();
    if (!pid) return [];
    return this.catalog.rowsOf(pid)();
  });

  /* ---------------- 派生状态 ---------------- */

  readonly rowsView = computed(() => {
    const rows = this.rows();
    const idx = this.runIndex();
    return rows.map((r) => {
      const taskId = r.spec.id;
      const activeRunId = idx[taskId];

      if (activeRunId) {
        const st = this.runtimeStore.statusSignal(activeRunId)();
        return {
          ...r,
          runtime: {
            ...(r.runtime ?? {}),
            runId: activeRunId,
            status: st.status,
          },
        };
      }

      return r;
    });
  });

  readonly rowsViewFiltered = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    const rows = this.rowsView();
    if (!kw) return rows;

    return rows.filter((r) => {
      return (
        r.spec.id?.toLowerCase().includes(kw) ||
        r.spec.name?.toLowerCase().includes(kw)
      );
    });
  });

  readonly selectedRow = computed(() => {
    const id = this.selectedTaskId();
    return this.rowsView().find((r) => r.spec.id === id) ?? null;
  });

  readonly selectedRuntimeStatus = computed<TaskRuntimeStatus>(() => {
    const runId = this.selectedRunId();
    if (!runId) return { status: "idle" };
    return this.runtimeStore.statusSignal(runId)();
  });

  readonly isRunning = computed(() => this.selectedRuntimeStatus().status === "running");
  readonly isStopping = computed(() => this.selectedRuntimeStatus().status === "stopping");
  readonly isStopped = computed(() => {
    const st = this.selectedRuntimeStatus().status;
    return st === "idle" || st === "stopped";
  });

  /* ---------------- 构造 & WS 同步 ---------------- */

  constructor() {
    /** WS 事件是 runIndex 的唯一实时来源 */
    this.stream.events$().subscribe((e) => {
      const taskId = String(e.payload?.taskId ?? "").trim();
      const runId = String(e.runId ?? "").trim();
      if (!taskId || !runId) return;

      if (
        e.type === "started" ||
        (e.type === "snapshot" && (e.payload as TaskSnapshotPayload)?.status === "running")
      ) {
        this.setActiveRun(taskId, runId);
      }

      if (
        e.type === "exited" ||
        e.type === "failed" ||
        (e.type === "snapshot" &&
          ["stopped", "failed", "success"].includes((e.payload as TaskSnapshotPayload)?.status))
      ) {
        this.clearActiveRun(taskId, runId);
      }
    });

    /** 选中 runId → 自动订阅 WS */
    effect((onCleanup) => {
      const runId = this.selectedRunId();
      if (!runId) return;

      this.stream.ensureConnected();
      this.stream.subscribeRun(runId, 200);

      const sub = this.runtimeStore.status$(runId).subscribe();
      onCleanup(() => {
        sub.unsubscribe();
        this.stream.unsubscribeRun(runId);
      });
    });
  }

  /* ---------------- 页面动作 ---------------- */

  async setProject(projectId: string) {
    const pid = projectId?.trim();
    if (!pid || this.projectId() === pid) return;

    this.projectId.set(pid);
    this.selectedTaskId.set("");
    this.selectedRunId.set("");
    this.keyword.set("");

    await this.catalog.ensureLoaded(pid);
    this.rehydrateFromViews(pid);

    const first = this.rows()[0];
    if (first) this.select(first.spec.id);
  }

  refresh() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set("");

    this.api.refresh(pid).subscribe({
      next: (rows) => {
        this.catalog.setRows(pid, rows ?? []);
        this.rehydrateFromViews(pid);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message ?? String(e));
        this.loading.set(false);
      },
    });
  }

  select(taskId: string) {
    this.selectedTaskId.set(taskId);

    const runId = this.runIndex()[taskId]
      ?? this.rows().find((r) => r.spec.id === taskId)?.runtime?.runId
      ?? "";

    this.selectedRunId.set(runId);
  }

  /* ---------------- 运行 / 停止 ---------------- */
  toggleTask() {
    if (this.isRunning()) {
      this.stopSelected();
    } else if (this.isStopped()) {
      this.startSelected();
    }
  }
  startSelected() {
    const spec = this.selectedRow()?.spec;
    if (!spec) return;

    this.api.start(spec.id).subscribe();
  }

  stopSelected() {
    const runId = this.selectedRunId();
    if (!runId) return;

    this.runtimeStore.set(runId, { status: "stopping" });
    this.api.stop(runId).subscribe();
  }

  /* ---------------- runIndex 管理（唯一） ---------------- */

  private setActiveRun(taskId: string, runId: string) {
    const next = { ...this.runIndex() };
    next[taskId] = runId;
    this.runIndex.set(next);

    if (this.selectedTaskId() === taskId) {
      this.selectedRunId.set(runId);
    }
  }

  private clearActiveRun(taskId: string, runId: string) {
    const cur = this.runIndex();
    if (cur[taskId] !== runId) return;

    const next = { ...cur };
    delete next[taskId];
    this.runIndex.set(next);

    if (this.selectedTaskId() === taskId) {
      const fallback =
        this.rows().find((r) => r.spec.id === taskId)?.runtime?.runId ?? "";
      this.selectedRunId.set(fallback);
    }
  }

  /* ---------------- 初始 hydrate ---------------- */

  private rehydrateFromViews(projectId: string) {
    this.api.getViews(projectId).subscribe({
      next: (views) => {
        for (const r of views ?? []) {
          const taskId = r.spec?.id;
          const rt = r.runtime;
          if (!taskId || !rt?.runId) continue;

          if (rt.status === "running" || rt.status === "stopping") {
            this.setActiveRun(taskId, rt.runId);
            this.runtimeStore.set(rt.runId, { status: rt.status });
            this.stream.ensureConnected();
            this.stream.subscribeRun(rt.runId, 200);
          }
        }
      },
    });
  }

  /* ---------------- 给 popover 用 ---------------- */

  rowsViewOf(projectId: string): Signal<TaskRow[]> {
    return computed(() => {
      const pid = projectId?.trim();
      if (!pid) return [];

      const rows = this.catalog.rowsOf(pid)();
      const idx = this.runIndex();

      return rows.map((r) => {
        const activeRunId = idx[r.spec.id];
        if (!activeRunId) return r;

        const st = this.runtimeStore.statusSignal(activeRunId)();
        return {
          ...r,
          runtime: { ...(r.runtime ?? {}), runId: activeRunId, status: st.status } as TaskRuntime,
        }
      });
    });
  }

  ensureProjectLoaded(projectId: string) {
    return this.catalog.ensureLoaded(projectId);
  }
}
