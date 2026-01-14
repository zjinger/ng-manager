import { Injectable, signal, WritableSignal } from '@angular/core';
import { TaskRuntimeStatus } from '@models/task.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskRuntimeStore {
  // taskId -> subject（给已有 rx 订阅用）
  private statusByTask = new Map<string, BehaviorSubject<TaskRuntimeStatus>>();
  // taskId -> signal（给 signal/computed 用）
  private sigByTask = new Map<string, WritableSignal<TaskRuntimeStatus>>();

  /** 给外部落地状态（WS event -> store） */
  setTaskStatus(taskId: string, st: TaskRuntimeStatus) {
    this.ensureSubject(taskId).next(st);
    this.ensureSignal(taskId).set(st);
    // console.log(`[task runtime store] sigByTask:`, this.sigByTask);
  }

  /** rx */
  status$(taskId: string): Observable<TaskRuntimeStatus> {
    return this.ensureSubject(taskId).asObservable();
  }

  /** signal：列表/组件 computed 直接用它 */
  statusSignal(taskId: string): WritableSignal<TaskRuntimeStatus> {
    return this.ensureSignal(taskId);
  }


  private snapshot(taskId: string): TaskRuntimeStatus {
    return this.ensureSignal(taskId)();
  }

  private ensureSubject(taskId: string) {
    const id = (taskId ?? "").trim();
    if (!this.statusByTask.has(id)) this.statusByTask.set(id, new BehaviorSubject<TaskRuntimeStatus>({ status: "idle" }));
    return this.statusByTask.get(id)!;
  }

  private ensureSignal(taskId: string) {
    const id = (taskId ?? "").trim();
    if (!this.sigByTask.has(id)) this.sigByTask.set(id, signal<TaskRuntimeStatus>({ status: "idle" }));
    return this.sigByTask.get(id)!;
  }
}
