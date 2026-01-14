import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { Observable } from "rxjs";
import { TaskRow, TaskRuntime } from "@models/task.model";
import { HttpParams } from "@angular/common/http";

@Injectable({ providedIn: "root" })
export class TasksApiService {
  private api = inject(ApiClient);

  /**
   * 刷新任务（页面进入时调用）
   * POST /tasks/refresh/:projectId
   */
  refresh(projectId: string): Observable<TaskRow[]> {
    return this.api.post(`/api/tasks/refresh/${projectId}`, {});
  }

  /**
   * 获取任务视图（spec + runtime）
   * GET /tasks/list/:projectId
   */
  getViews(projectId: string): Observable<TaskRow[]> {
    return this.api.get(`/api/tasks/list/${projectId}`);
  }

  /**
   * 查询任务状态
   * GET /tasks/status/:taskId
   */
  getStatus(taskId: string): Observable<TaskRuntime> {
    return this.api.get(`/api/tasks/status/${taskId}`);
  }

  start(taskId: string): Observable<TaskRuntime> {
    return this.api.post(`/api/tasks/start`, { taskId });
  }

  stop(taskId: string): Observable<TaskRuntime> {
    return this.api.post(`/api/tasks/stop`, { taskId });
  }

  active(): Observable<TaskRuntime[]> {
    return this.api.get(`/api/tasks/active`);
  }

  getRunLog(runId: string, tail = 200) {
    const params = new HttpParams().set("tail", tail.toString());
    return this.api.get(`/api/tasks/log/run/${runId}`, params);
  }

  getSyslog(tail = 200) {
    const params = new HttpParams().set("tail", tail.toString());
    return this.api.get(`/api/tasks/syslog`, params);
  }
}
