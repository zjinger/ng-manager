import { Injectable, Signal, computed, effect, inject, signal } from "@angular/core";
import { TaskRow, TaskRuntime, TaskRuntimeStatus } from "@models/task.model";
import { TasksApiService } from "./tasks-api.service";
import { TaskStreamService } from "./task-stream.service";
import { TaskRuntimeStore } from "./task-runtime-store";
import { TaskCatalogService } from "./task-catalog.service";
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
  readonly selectedTaskId = signal<string>("");

  /** 当前项目 rows（spec + runtime 快照） */
  readonly rows = computed<TaskRow[]>(() => {
    const pid = this.projectId();
    if (!pid) return [];
    return this.catalog.rowsOf(pid)();
  });

  /* ---------------- 派生状态 ---------------- */

  readonly rowsView = computed(() => {
    const rows = this.rows();
    return rows.map((r) => {
      const taskId = r.spec.id;
      const rt = this.runtimeStore.runtimeSignal(taskId)();
      return {
        ...r,
        runtime: rt ?? r.runtime,
      };
    });
  });

  readonly rowsViewFiltered = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    const rows = this.rowsView();
    if (!kw) return rows;
    return rows.filter((r) => {
      return (
        r.spec.name?.toLowerCase().includes(kw)
      );
    });
  });

  readonly selectedRow = computed(() => {
    const id = this.selectedTaskId();
    return this.rowsView().find((r) => r.spec.id === id) ?? null;
  });

  readonly selectedRuntimeStatus = computed<TaskRuntimeStatus>(() => {
    const taskId = this.selectedTaskId();
    if (!taskId) return { status: "idle" };
    const st = this.runtimeStore.statusSignal(taskId)();
    return st;
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
      console.log("[task state] event", e);
    });

    /** 选中 runId → 自动订阅 WS */
    effect((onCleanup) => {
      const taskId = this.selectedTaskId();
      if (!taskId) return;
      // console.log("[task state effect] subscribe task stream", taskId);
      this.stream.ensureConnected();
      this.stream.subscribeTask(taskId, 200);
      const sub = this.runtimeStore.status$(taskId).subscribe();
      onCleanup(() => {
        sub.unsubscribe();
        this.stream.unsubscribeTask(taskId);
      });
    });
  }

  /* ---------------- 页面动作 ---------------- */

  async setProject(projectId: string) {
    const pid = projectId?.trim();
    if (!pid || this.projectId() === pid) return;
    this.projectId.set(pid);
    this.selectedTaskId.set("");
    this.keyword.set("");
    await this.catalog.ensureLoaded(pid);
    const first = this.rows()[0];
    if (first) this.select(first.spec.id);
  }

  refresh() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);

    this.api.refresh(pid).subscribe({
      next: (rows) => {
        this.catalog.setRows(pid, rows ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
      },
    });
  }

  select(taskId: string) {
    this.selectedTaskId.set(taskId);
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
    const taskId = this.selectedTaskId();
    if (!taskId) return;
    // 取当前 runtime（必须要有 runId/projectId 才能工程化维护 runningCount） 
    const curRt = this.stream.getRuntime(taskId); // 注入 TaskStreamService
    if (curRt) {
      // 先置 stopping（保留 pid/startedAt/runId/projectId）
      this.runtimeStore.setRuntime({ ...curRt, status: 'stopping' });
    }

    this.api.stop(taskId).subscribe({
      next: () => { },
      error: () => {
        // 回滚：如果乐观置了 stopping，则恢复为 running（前提：原来确实在 running）
        if (curRt && curRt.status === 'running') {
          this.runtimeStore.setRuntime(curRt);
        }
      }
    });
  }

  /* ---------------- 给 popover 用 ---------------- */

  rowsViewOf(projectId: string): Signal<TaskRow[]> {
    return computed(() => {
      const pid = projectId?.trim();
      if (!pid) return [];
      const rows = this.catalog.rowsOf(pid)();
      return rows.map((r) => {
        const taskId = r.spec.id;
        const st = this.runtimeStore.statusSignal(taskId)();
        return {
          ...r,
          runtime: { ...(r.runtime ?? {}), status: st.status } as TaskRuntime,
        }
      });
    });
  }

  ensureProjectLoaded(projectId: string) {
    return this.catalog.ensureLoaded(projectId);
  }

}
