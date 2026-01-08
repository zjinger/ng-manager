import { Injectable, computed, signal } from "@angular/core";
import { TaskLogLine, TaskRow, TaskRuntime } from "@models/task.model";
import { TasksApiService } from "./tasks-api.service";
@Injectable({ providedIn: "root" })
export class TaskStateService {
  // 由页面传入
  readonly projectId = signal<string>("");

  // UI 状态
  readonly keyword = signal<string>("");
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>("");

  // 数据
  readonly rows = signal<TaskRow[]>([]);
  readonly selectedTaskId = signal<string>("");

  // log
  readonly logOpen = signal(false);
  readonly logLines = signal<TaskLogLine[]>([]);
  readonly logLoading = signal(false);

  readonly activeRunId = signal<string>("");
  readonly selectedRunId = signal<string>("");

  readonly isRunning = computed(() => this.selectedRuntime()?.status === "running");
  readonly isStopping = computed(() => this.selectedRuntime()?.status === "stopping");
  readonly isDisabled = computed(() => {
    const spec = this.selectedSpec();
    if (!spec) return true;
    return spec.runnable === false;
  })

  // 当前选中行
  readonly selectedRow = computed(() => {
    const id = this.selectedTaskId();
    if (!id) return null;
    return this.rows().find(r => r.spec.id === id) ?? null;
  });

  readonly selectedSpec = computed(() => this.selectedRow()?.spec ?? null);
  readonly selectedRuntime = computed(() => this.selectedRow()?.runtime ?? null);

  // 过滤后的列表（给页面直接用）
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

  constructor(private api: TasksApiService) { }

  /** 页面切换项目时调用 */
  setProject(projectId: string) {
    if (!projectId) return;
    if (this.projectId() === projectId) return;
    this.projectId.set(projectId);
    this.selectedTaskId.set("");
    this.keyword.set("");
    this.refresh();
  }

  refresh() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set("");

    this.api.refresh(pid).subscribe({
      next: (res) => {
        this.rows.set(res);
        this.loading.set(false);
        // 选中态兜底：如果没选中，默认选第一个可运行任务（跳过 desc）
        if (!this.selectedTaskId()) {
          // const firstRunnable = this.rows().find(v => v.spec.kind !== "desc") ?? this.rows()[0];
          const firstRunnable = this.rows()[0];
          if (firstRunnable) this.selectedTaskId.set(firstRunnable.spec.id);
        } else {
          // scripts 变化导致选中项消失
          if (!this.rows().some(v => v.spec.id === this.selectedTaskId())) {
            this.selectedTaskId.set("");
          }
        }
      },
      error: (err) => {
        this.error.set(err?.message || String(err));
        this.loading.set(false);
      }
    });
  }

  select(taskId: string) {
    this.selectedTaskId.set(taskId);
    const row = this.rows().find(r => r.spec.id === taskId);
    this.selectedRunId.set(row?.runtime?.runId ?? "");
  }

  toggleTask() {
    if (this.isRunning()) {
      this.stopSelected();
    } else {
      this.startSelected();
    }
  }

  startSelected() {
    const spec = this.selectedSpec();
    if (!spec) return;

    this.api.start(spec.id).subscribe({
      next: (rt) => {
        this.upsertRuntime(rt);
        this.activeRunId.set(rt.runId);
        this.selectedRunId.set(rt.runId);
      },
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  stopSelected() {
    const rt = this.selectedRuntime();
    if (!rt?.runId) return;

    this.api.stop(rt.runId).subscribe({
      next: (nextRt) => this.upsertRuntime(nextRt),
      error: (err) => this.error.set(err?.message || String(err)),
    });
  }

  openLog() {
    this.logOpen.set(true);
    // 打开抽屉时拉一次日志
    this.pullLog(300);
  }

  closeLog() {
    this.logOpen.set(false);
  }

  clearLog() {
    this.logLines.set([]);
  }

  /** 将 runtime 合并进对应 spec（taskId === spec.id） */
  private upsertRuntime(rt: TaskRuntime) {
    const rows = this.rows();
    const idx = rows.findIndex(r => r.spec.id === rt.taskId);
    if (idx === -1) return;
    const next = rows.slice();
    next[idx] = { ...next[idx], runtime: rt };
    this.rows.set(next);
  }

  /** 拉取当前选中任务日志（HTTP tail） */
  pullLog(tail = 200) {

  }
}
