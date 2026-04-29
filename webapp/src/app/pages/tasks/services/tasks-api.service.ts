import { inject, Injectable } from "@angular/core";
import { ApiClient } from "@core/api";
import { Observable } from "rxjs";
import { HttpParams } from "@angular/common/http";
import { Project } from "@models/project.model";
import type {
  TaskActiveResponseDto,
  TaskCommandRequestDto,
  TaskListResponseDto,
  TaskRefreshResponseDto,
  TaskRunLogResponseDto,
  TaskRuntimeResponseDto,
} from "@yinuo-ngm/protocol";

@Injectable({ providedIn: "root" })
export class TasksApiService {
  private api = inject(ApiClient);

  /**
   * 刷新任务（页面进入时调用）
   * POST /tasks/refresh/:projectId
   */
  refresh(projectId: string): Observable<TaskRefreshResponseDto> {
    return this.api.post<TaskRefreshResponseDto>(`/api/tasks/refresh/${projectId}`, {});
  }

  /**
   * 刷新项目 scripts（重新扫描 package.json）
   * POST /projects/refreshScripts/:projectId
   */
  refreshProjectScripts(projectId: string): Observable<Project> {
    return this.api.post<Project>(`/api/projects/refreshScripts/${projectId}`, {});
  }

  /**
   * 获取任务视图（spec + runtime）
   * GET /tasks/list/:projectId
   */
  getViews(projectId: string): Observable<TaskListResponseDto> {
    return this.api.get<TaskListResponseDto>(`/api/tasks/list/${projectId}`);
  }

  /**
   * 查询任务状态
   * GET /tasks/status/:taskId
   */
  getStatus(taskId: string): Observable<TaskRuntimeResponseDto> {
    return this.api.get<TaskRuntimeResponseDto>(`/api/tasks/status/${taskId}`);
  }

  start(taskId: string): Observable<TaskRuntimeResponseDto> {
    const body: TaskCommandRequestDto = { taskId };
    return this.api.post<TaskRuntimeResponseDto>(`/api/tasks/start`, body);
  }

  stop(taskId: string): Observable<TaskRuntimeResponseDto> {
    const body: TaskCommandRequestDto = { taskId };
    return this.api.post<TaskRuntimeResponseDto>(`/api/tasks/stop`, body);
  }

  restart(taskId: string): Observable<TaskRuntimeResponseDto> {
    const body: TaskCommandRequestDto = { taskId };
    return this.api.post<TaskRuntimeResponseDto>(`/api/tasks/restart`, body);
  }

  active(): Observable<TaskActiveResponseDto> {
    return this.api.get<TaskActiveResponseDto>(`/api/tasks/active`);
  }

  getRunLog(runId: string, tail = 200): Observable<TaskRunLogResponseDto> {
    const params = new HttpParams().set("tail", tail.toString());
    return this.api.get<TaskRunLogResponseDto>(`/api/tasks/log/run/${runId}`, params);
  }

  getSyslog(tail = 200) {
    const params = new HttpParams().set("tail", tail.toString());
    return this.api.get(`/api/tasks/syslog`, params);
  }
}
