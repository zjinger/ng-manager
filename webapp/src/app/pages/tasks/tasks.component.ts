import { Component } from '@angular/core';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { signal } from '@angular/core';
import { TasksApiService } from './services/tasks-api.service';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from './task-list/task-list.component';

@Component({
  selector: 'app-tasks',
  imports: [TaskConsoleComponent, FormsModule, TaskListComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.less',
})
export class TasksComponent {

  projectId = signal("p1");
  selectedTaskId = signal("");

  // 可选：启动表单（便于测试）
  name = "node-version";
  command = "node -v";
  cwd = ".";

  starting = false;
  startError = "";

  constructor(private api: TasksApiService) { }

  async start() {
    this.starting = true;
    this.startError = "";
    try {
      const rt = await this.api.start({
        projectId: this.projectId(),
        name: this.name,
        command: this.command,
        cwd: this.cwd,
      });
      this.selectedTaskId.set(rt.taskId);
    } catch (e: any) {
      this.startError = e?.message || String(e);
    } finally {
      this.starting = false;
    }
  }

  async stopSelected() {
    if (!this.selectedTaskId()) return;
    await this.api.stop(this.selectedTaskId());
  }

}
