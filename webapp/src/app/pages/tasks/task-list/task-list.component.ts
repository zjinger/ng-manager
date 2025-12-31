import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from "@angular/core";
import { TasksApiService, type TaskRuntime } from "../services/tasks-api.service";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-task-list",
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzSpaceModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,],
  templateUrl: "./task-list.component.html",
  styleUrls: ["./task-list.component.less"],
})
export class TaskListComponent implements OnChanges {
  @Input() projectId: string = "p1";
  @Input() selectedTaskId: string = "";
  @Output() selectedTaskIdChange = new EventEmitter<string>();
  readonly keyword = signal("");
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
