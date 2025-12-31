import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { TasksApiService, type TaskRuntime } from "../services/tasks-api.service";

@Component({
  selector: "app-task-list",
  templateUrl: "./task-list.component.html",
  styleUrls: ["./task-list.component.less"],
})
export class TaskListComponent implements OnChanges {
  @Input() projectId: string = "p1";
  @Input() selectedTaskId: string = "";
  @Output() selectedTaskIdChange = new EventEmitter<string>();

  loading = false;
  error = "";
  list: TaskRuntime[] = [];

  constructor(private api: TasksApiService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["projectId"]) {
      this.refresh();
    }
  }

  async refresh() {
    this.loading = true;
    this.error = "";
    try {
      this.list = await this.api.listByProject(this.projectId);
    } catch (e: any) {
      this.error = e?.message || String(e);
    } finally {
      this.loading = false;
    }
  }

  select(id: string) {
    this.selectedTaskId = id;
    this.selectedTaskIdChange.emit(id);
  }

  badge(status: TaskRuntime["status"]) {
    return status;
  }

  trackByTaskId = (_: number, item: TaskRuntime) => item.taskId;
}
