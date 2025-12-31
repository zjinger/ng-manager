import { Injectable, signal } from '@angular/core';
import { TaskLogLine, TaskRow, TaskStatus } from '@models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TasksFacadeService {
  readonly rows = signal<TaskRow[]>([]);
  readonly logOpen = signal(false);
  readonly logTaskId = signal("");
  readonly logLines = signal<TaskLogLine[]>([]);

  load(projectId: string) {
    // TODO: 接 Fastify: GET /projects/:id/tasks
    this.rows.set([
      { def: { id: "dev:serve", name: "启动前端", group: "frontend" }, rt: { taskId: "dev:serve", status: "idle" } },
      { def: { id: "server:dev", name: "启动本地服务", group: "backend" }, rt: { taskId: "server:dev", status: "running", pid: 32100 } },
      { def: { id: "build", name: "构建", group: "tools" }, rt: { taskId: "build", status: "error" } },
    ]);
  }

  setTaskId(taskId: string) {
    this.logTaskId.set(taskId);
  }

  statusColor(s: TaskStatus) {
    switch (s) {
      case "running": return "green";
      case "success": return "success";
      case "error": return "error";
      case "stopped": return "orange";
      default: return "default";
    }
  }

  run(taskId: string) {
    // TODO: POST /tasks/:id/run
    this.patch(taskId, "running", 40000 + Math.floor(Math.random() * 1000));
    this.appendLog(taskId, "system", `Run ${taskId}`);
  }

  stop(taskId: string) {
    // TODO: POST /tasks/:id/stop
    this.patch(taskId, "stopped");
    this.appendLog(taskId, "system", `Stop ${taskId}`);
  }

  openLog(taskId?: string) {
    if (taskId) {
      this.setTaskId(taskId);
    }
    this.logOpen.set(true);
    // TODO: 订阅 WS：taskId 的 log stream
    this.appendLog(this.logTaskId(), "stdout", "hello log...");
  }

  closeLog() {
    this.logOpen.set(false);
  }

  clearLog() {
    this.logLines.set([]);
  }

  private patch(taskId: string, status: TaskStatus, pid?: number) {
    this.rows.update(list =>
      list.map(r => r.def.id === taskId ? { ...r, rt: { ...r.rt, status, pid: pid ?? r.rt.pid } } : r)
    );
  }

  private appendLog(taskId: string, type: TaskLogLine["type"], message: string) {
    const line: TaskLogLine = { taskId, type, message, time: Date.now() };
    this.logLines.update(xs => (this.logTaskId() === taskId ? [...xs, line] : xs));
  }
}
