import { Injectable, computed, inject, signal } from "@angular/core";
import type { TaskRow } from "@models/task.model";
import { firstValueFrom } from "rxjs";
import { TasksApiService } from "./tasks-api.service";
import { TaskRuntimeStore } from "./task-runtime-store";

type ProjectId = string;

type CatalogState = {
  rowsByProject: Record<ProjectId, TaskRow[]>;
  loadingByProject: Record<ProjectId, boolean>;
  loadedAtByProject: Record<ProjectId, number | undefined>;
};

@Injectable({ providedIn: "root" })
export class TaskCatalogService {
  private api = inject(TasksApiService);
  private runtimeStore = inject(TaskRuntimeStore);
  private state = signal<CatalogState>({
    rowsByProject: {},
    loadingByProject: {},
    loadedAtByProject: {},
  });

  /** 某项目任务 rows（spec + runtime快照，可选），不包含 ui 运行态 */
  rowsOf(projectId: string) {
    const pid = (projectId ?? "").trim();
    return computed(() => this.state().rowsByProject[pid] ?? []);
  }

  /** 是否正在加载中 */
  isLoading(projectId: string) {
    const pid = (projectId ?? "").trim();
    return computed(() => !!this.state().loadingByProject[pid]);
  }

  /** 是否已缓存：以 loadedAt 为准（0 tasks 也算 loaded） */
  isLoaded(projectId: string) {
    const pid = (projectId ?? "").trim();
    return computed(() => this.state().loadedAtByProject[pid] != null);
  }

  /**
   * 主入口：确保该项目 tasks 已加载
   * 使用 getViews(list) 读取，不做 refresh（避免副作用）
   */
  async ensureLoaded(projectId: string, opts?: { force?: boolean }): Promise<void> {
    const pid = (projectId ?? "").trim();
    if (!pid) return;

    const s = this.state();
    const loaded = s.loadedAtByProject[pid] != null;
    const loading = !!s.loadingByProject[pid];
    if (!opts?.force && (loaded || loading)) return;

    this.state.update((st) => ({
      ...st,
      loadingByProject: { ...st.loadingByProject, [pid]: true },
    }));

    try {
      const res = await firstValueFrom(this.api.getViews(pid));
      // console.log("[task catalog] loaded", pid, res);

      // 这里保留后端 runtime（是快照，不是实时态）
      const normalized: TaskRow[] = (res ?? []).map((r: any) => ({
        spec: r.spec,
        runtime: r.runtime
          ? {
            taskId: r.runtime.taskId,
            projectId: r.runtime.projectId,
            runId: r.runtime.runId,
            status: r.runtime.status,
            pid: r.runtime.pid,
            startedAt: r.runtime.startedAt,
            stoppedAt: r.runtime.stoppedAt,
            exitCode: r.runtime.exitCode,
            signal: r.runtime.signal,
          }
          : undefined,
      }));

      // 用后端 runtime 快照初始化 runtimeStore（建立 runningCount）
      for (const row of normalized) {
        if (row.runtime) this.runtimeStore.setRuntime(row.runtime);
      }

      this.state.update((st) => ({
        ...st,
        rowsByProject: { ...st.rowsByProject, [pid]: normalized },
        loadedAtByProject: { ...st.loadedAtByProject, [pid]: Date.now() },
      }));
    } finally {
      this.state.update((st) => ({
        ...st,
        loadingByProject: { ...st.loadingByProject, [pid]: false },
      }));
    }
  }

  /** tasks 页面刷新后，把结果写回 catalog（保持一致） */
  setRows(projectId: string, rows: TaskRow[]) {
    const pid = (projectId ?? "").trim();
    if (!pid) return;
    for (const row of rows ?? []) {
      if (row.runtime) this.runtimeStore.setRuntime(row.runtime);
    }
    this.state.update((st) => ({
      ...st,
      rowsByProject: { ...st.rowsByProject, [pid]: rows ?? [] },
      loadedAtByProject: { ...st.loadedAtByProject, [pid]: Date.now() },
    }));
  }

  /** 清除某项目缓存 */
  clear(projectId: string) {
    const pid = (projectId ?? "").trim();
    if (!pid) return;

    this.state.update((st) => {
      const rowsByProject = { ...st.rowsByProject };
      const loadingByProject = { ...st.loadingByProject };
      const loadedAtByProject = { ...st.loadedAtByProject };
      delete rowsByProject[pid];
      delete loadingByProject[pid];
      delete loadedAtByProject[pid];
      return { rowsByProject, loadingByProject, loadedAtByProject };
    });
  }
}
