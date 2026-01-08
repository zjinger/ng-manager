import { Component, Input } from '@angular/core';
import { TaskStatus } from '@models/task.model';

@Component({
  selector: 'app-task-status-badge',
  imports: [],
  templateUrl: './task-status-badge.component.html',
  styleUrl: './task-status-badge.component.less',
})
export class TaskStatusBadgeComponent {
  @Input() status: TaskStatus = "idle";

  get color(): string {
    switch (this.status) {
      case "running": return "#22c55e";
      case "success": return "#16a34a";
      case "failed": return "#ef4444";
      case "stopped": return "#f59e0b";
      default: return "rgba(0,0,0,.25)";
    }
  }
}
