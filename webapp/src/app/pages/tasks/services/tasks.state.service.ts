import { Injectable, Signal, computed, effect, inject, signal } from "@angular/core";
import { TaskRow, TaskRuntime, TaskRuntimeStatus } from "@models/task.model";
import { TasksApiService } from "./tasks-api.service";
import { TaskStreamService } from "./task-stream.service";
import { TaskRuntimeStore } from "./task-runtime-store";
import { TaskCatalogService } from "./task-catalog.service";
import { ProjectContextStore } from "@app/core/stores/project-context/project-context.store";
import { NodeVersionService } from '../node-version/node-version.service';

@Injectable({ providedIn: "root" })
export class TaskStateService {
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private runtimeStore = inject(TaskRuntimeStore);
  private catalog = inject(TaskCatalogService);
  private nodeVersion = inject(NodeVersionService);
  private projectContext = inject(ProjectContextStore);
  private subscribedTaskIds = new Set<string>();

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
      const rt = this.getRuntimeSignal(taskId);
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
    const st = this.getRuntime(taskId);
    return st;
  });

  readonly isRunning = computed(() => this.selectedRuntimeStatus().status === "running");
  readonly isStopping = computed(() => this.selectedRuntimeStatus().status === "stopping");
  readonly isStopped = computed(() => {
    const st = this.selectedRuntimeStatus().status;
    return st === "idle" || st === "stopped" || st === "failed" || st === "success";
  });

  /* ---------------- 构造 & WS 同步 ---------------- */

  constructor() {
    /** WS 事件是 runIndex 的唯一实时来源 */
    // this.stream.events$().subscribe((e) => {
    // console.log("[task state] event", e);
    // });

    /** project tasks -> WS 订阅同步（保证未选中任务状态也实时） */
    effect(() => {
      const pid = this.projectId();
      const ids = new Set<string>();
      if (pid) {
        for (const row of this.rows()) {
          const taskId = row?.spec?.id?.trim();
          if (taskId) ids.add(taskId);
        }
      }
      this.syncTaskSubs(ids);
      if (ids.size > 0) this.stream.ensureConnected();
    });

    /** 选中任务提高 tail（便于 console 立即拿到上下文日志） */
    effect((onCleanup) => {
      const taskId = this.selectedTaskId();
      if (!taskId) return;
      this.stream.subscribeTask(taskId, 200);
      onCleanup(() => {
        this.stream.unsubscribeTask(taskId);
      });
    });
  }

  private syncTaskSubs(nextIds: Set<string>) {
    for (const taskId of this.subscribedTaskIds) {
      if (!nextIds.has(taskId)) {
        this.stream.unsubscribeTask(taskId);
      }
    }
    for (const taskId of nextIds) {
      if (!this.subscribedTaskIds.has(taskId)) {
        this.stream.subscribeTask(taskId, 0);
      }
    }
    this.subscribedTaskIds = nextIds;
  }

  getRuntime(taskId: string): TaskRuntimeStatus {
    return this.runtimeStore.statusSignal(taskId)();
  }

  private getRuntimeSignal(taskId: string): TaskRuntime | undefined {
    return this.runtimeStore.runtimeSignal(taskId)();
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

    this.api.refreshProjectScripts(pid).subscribe({
      next: (updated) => {
        this.projectContext.patchProject(updated);
      },
      error: () => { },
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

  /**
   * 启动选中任务
   * @param taskId 如果不传则启动 selectedTaskId 指定的任务
   */
  startSelected(taskId?: string) {
    taskId = taskId?.trim() || this.selectedRow()?.spec?.id;
    if (!taskId) return;
    // const spec = this.selectedRow()?.spec;
    // if (!spec) return;
    this.api.start(taskId).subscribe({
      next: () => {
        // 任务启动后刷新 Node 版本信息（可能已自动切换）
          this.nodeVersion.refresh();
      }
    });
  }

  /**
   * 停止选中任务
   * @param taskId 如果不传则停止 selectedTaskId 指定的任务
   */
  stopSelected(taskId?: string) {
    taskId = taskId?.trim() || this.selectedTaskId();
    if (!taskId) return;
    // 取当前 runtime（必须要有 runId/projectId 才能工程化维护 runningCount） 
    const curRt = this.getRuntimeSignal(taskId);
    if (curRt) {
      // 先置 stopping（保留 pid/startedAt/runId/projectId）
      this.runtimeStore.setRuntime({ ...curRt, status: 'stopping' });
    }

    this.api.stop(taskId).subscribe({
      next: () => { },
      error: () => {
        // 回滚：如果乐观置了 stopping，则恢复为 running（前提：原来确实在 running）
        const nowRt = this.getRuntimeSignal(taskId!);
        if (
          curRt &&
          curRt.status === 'running' &&
          nowRt &&
          nowRt.runId === curRt.runId &&
          nowRt.status === 'stopping'
        ) {
          this.runtimeStore.setRuntime(curRt);
        }
      }
    });
  }

  /**
   * 重启选中任务
   * @param taskId 如果不传则重启 selectedTaskId 指定的任务
   */
  restartSelected(taskId?: string) {
    taskId = taskId?.trim() || this.selectedTaskId();
    if (!taskId) return;
    this.api.restart(taskId).subscribe();
  }

  /* ---------------- 给 popover 用 ---------------- */

  rowsViewOf(projectId: string): Signal<TaskRow[]> {
    return computed(() => {
      const pid = projectId?.trim();
      if (!pid) return [];
      const rows = this.catalog.rowsOf(pid)();
      return rows.map((r) => {
        const taskId = r.spec.id;
        const st = this.getRuntime(taskId);
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
