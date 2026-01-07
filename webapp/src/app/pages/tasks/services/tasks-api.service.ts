import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@app/core/api/api-client";
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
   * 后端已做懒加载
   */
  getViews(projectId: string): Observable<TaskRow[]> {
    return this.api.get(`/api/tasks/list/${projectId}`);
  }

  /**
   * 启动任务（唯一方式）
   * POST /tasks/start
   */
  start(projectId: string, specId: string): Observable<TaskRuntime> {
    return this.api.post(`/api/tasks/start`, {
      projectId,
      specId,
    });
  }

  /**
   * 停止任务
   * POST /task/stop/:taskId
   */
  stop(taskId: string): Observable<TaskRuntime> {
    return this.api.post(`/api/tasks/stop/${taskId}`, {});
  }

  /**
   * 查询任务状态
   * GET /tasks/status/:taskId
   */
  getStatus(taskId: string): Observable<TaskRuntime> {
    return this.api.get(`/api/tasks/status/${taskId}`);
  }

  /**
   * 拉取任务日志（HTTP 拉取，非 WS）
   * GET /tasks/log/:taskId?tail=200
   */
  getLog(taskId: string, tail = 200): Observable<any[]> {
    const params = new HttpParams().set("tail", tail.toString());
    return this.api.get(`/api/tasks/log/${taskId}`, params);
  }
}
