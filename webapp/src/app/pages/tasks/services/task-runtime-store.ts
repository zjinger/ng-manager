import { Injectable, signal, WritableSignal } from '@angular/core';
import { TaskRuntimeStatus } from '@models/task.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskRuntimeStore {
  // runId -> subject（给已有 rx 订阅用）
  private statusByRun = new Map<string, BehaviorSubject<TaskRuntimeStatus>>();
  // runId -> signal（给 signal/computed 用）
  private sigByRun = new Map<string, WritableSignal<TaskRuntimeStatus>>();

  /** rx */
  status$(runId: string): Observable<TaskRuntimeStatus> {
    return this.ensureSubject(runId).asObservable();
  }

  /** signal：列表/组件 computed 直接用它 */
  statusSignal(runId: string): WritableSignal<TaskRuntimeStatus> {
    return this.ensureSignal(runId);
  }

  /** 给外部落地状态（WS event -> store） */
  set(runId: string, st: TaskRuntimeStatus) {
    this.ensureSubject(runId).next(st);
    this.ensureSignal(runId).set(st);
  }

  snapshot(runId: string): TaskRuntimeStatus {
    return this.ensureSignal(runId)();
  }

  private ensureSubject(runId: string) {
    const id = (runId ?? "").trim();
    if (!this.statusByRun.has(id)) this.statusByRun.set(id, new BehaviorSubject<TaskRuntimeStatus>({ status: "idle" }));
    return this.statusByRun.get(id)!;
  }

  private ensureSignal(runId: string) {
    const id = (runId ?? "").trim();
    if (!this.sigByRun.has(id)) this.sigByRun.set(id, signal<TaskRuntimeStatus>({ status: "idle" }));
    return this.sigByRun.get(id)!;
  }
}
