import { Injectable, signal, WritableSignal } from '@angular/core';
import type { TaskStatus } from '@core/ws';
import type { TaskRuntime, TaskRuntimeStatus } from '@models/task.model';
import { BehaviorSubject, Observable } from 'rxjs';
/**
 * TaskRuntimeStore
 * - taskId -> TaskRuntimeStatus  (给任务列表/详情用)
 * - projectId -> runningCount   (给 ProjectItem 判断是否有任务在跑)
 *
 * 运行态判定：
 * - running / stopping 都算“占用中”
 *   （后端：running/stopping 都不允许再次 start）
 */
@Injectable({
  providedIn: 'root',
})
export class TaskRuntimeStore {
  /* ---------------- taskId -> status ---------------- */
  // taskId -> subject（给已有 rx 订阅用）
  private statusByTask = new Map<string, BehaviorSubject<TaskRuntimeStatus>>();
  // taskId -> signal（给 signal/computed 用）
  private sigByTask = new Map<string, WritableSignal<TaskRuntimeStatus>>();

  // taskId -> runtime（完整 runtime 信息）
  private runtimeByTask = new Map<string, WritableSignal<TaskRuntime | undefined>>();

  /* ---------------- projectId -> runningCount ---------------- */
  private runningCountByProject = new Map<string, WritableSignal<number>>();

  private totalRunningCount = signal<number>(0);

  totalRunningCountSignal() {
    return this.totalRunningCount;
  }

  setRuntime(rt: TaskRuntime): void {
    const taskId = this.norm(rt.taskId);
    const projectId = this.norm(rt.projectId);
    if (!taskId || !projectId) return;

    const prev = this.ensureTaskSignal(taskId)(); // snapshot
    const prevBusy = this.isBusy(prev.status);
    const nextBusy = this.isBusy(rt.status);

    const next = this.toStatus(rt);

    // 更新 task 维度
    this.ensureTaskSubject(taskId).next(next);
    this.ensureTaskSignal(taskId).set(next);
    this.ensureRuntimeSignal(taskId).set(rt);

    // 更新 project runningCount
    if (prevBusy !== nextBusy) {
      const cntSig = this.ensureProjectCount(projectId);
      const cur = cntSig();
      cntSig.set(prevBusy ? Math.max(0, cur - 1) : cur + 1);

      // total count
      const curTotal = this.totalRunningCount();
      this.totalRunningCount.set(prevBusy ? Math.max(0, curTotal - 1) : curTotal + 1);
    }
    // console.log("[task runtime] set", taskId, rt, "->", next);
  }

  /** rx */
  status$(taskId: string): Observable<TaskRuntimeStatus> {
    return this.ensureTaskSubject(taskId).asObservable();
  }

  /** signal：列表/组件 computed 直接用它 */
  statusSignal(taskId: string): WritableSignal<TaskRuntimeStatus> {
    return this.ensureTaskSignal(taskId);
  }

  /** signal：获取完整 runtime 信息 */
  runtimeSignal(taskId: string): WritableSignal<TaskRuntime | undefined> {
    return this.ensureRuntimeSignal(taskId);
  }

  /**  ProjectItem 用：O(1) 判断 project 是否有任务占用中 */
  hasRunning(projectId: string): boolean {
    return this.ensureProjectCount(projectId)() > 0;
  }

  /** signal 版（在模板 / computed 里用） */
  runningCountSignal(projectId: string): WritableSignal<number> {
    return this.ensureProjectCount(projectId);
  }

  private snapshot(taskId: string): TaskRuntimeStatus {
    return this.ensureTaskSignal(taskId)();
  }

  /**
   * 将 TaskRuntime 转为 TaskRuntimeStatus
   * @param rt TaskRuntime
   * @return TaskRuntimeStatus
   */
  private toStatus(rt: TaskRuntime): TaskRuntimeStatus {
    switch (rt.status) {
      case 'idle':
        return { status: 'idle' };
      case 'running':
        return { status: 'running', pid: rt.pid, startedAt: rt.startedAt };
      case 'stopping':
        return { status: 'stopping' };
      case 'failed':
        return {
          status: 'failed',
          exitCode: rt.exitCode ?? null,
          signal: rt.signal ?? null,
          stoppedAt: rt.stoppedAt,
        };
      case 'success':
        return {
          status: 'success',
          exitCode: rt.exitCode ?? null,
          signal: rt.signal ?? null,
          stoppedAt: rt.stoppedAt,
        };
      case 'stopped':
        return {
          status: 'stopped',
          exitCode: rt.exitCode ?? null,
          signal: rt.signal ?? null,
          stoppedAt: rt.stoppedAt,
        };
      default:
        return { status: 'idle' };
    }
  }
  /** busy = running-like，占用态：running/stopping */
  private isBusy(st: TaskStatus | TaskRuntimeStatus['status']): boolean {
    return st === 'running' || st === 'stopping';
  }

  private norm(v: string | undefined | null): string {
    return (v ?? '').trim();
  }

  private ensureTaskSubject(taskId: string) {
    const id = this.norm(taskId);
    if (!this.statusByTask.has(id)) {
      this.statusByTask.set(id, new BehaviorSubject<TaskRuntimeStatus>({ status: 'idle' }));
    }
    return this.statusByTask.get(id)!;
  }

  private ensureTaskSignal(taskId: string) {
    const id = this.norm(taskId);
    if (!this.sigByTask.has(id)) {
      this.sigByTask.set(id, signal<TaskRuntimeStatus>({ status: 'idle' }));
    }
    return this.sigByTask.get(id)!;
  }

  private ensureProjectCount(projectId: string) {
    const id = this.norm(projectId);
    if (!this.runningCountByProject.has(id)) {
      this.runningCountByProject.set(id, signal<number>(0));
    }
    return this.runningCountByProject.get(id)!;
  }

  private ensureRuntimeSignal(taskId: string) {
    const id = this.norm(taskId);
    if (!this.runtimeByTask.has(id)) {
      this.runtimeByTask.set(id, signal<TaskRuntime | undefined>(undefined));
    }
    return this.runtimeByTask.get(id)!;
  }

}
