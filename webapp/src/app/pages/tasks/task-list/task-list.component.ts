import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TaskRuntime } from "@models/task.model";
import { NzBadgeModule } from "ng-zorro-antd/badge";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { TaskStateService } from "../services/tasks.state.service";

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
    NzInputModule,
    NzTooltipModule,
    NzBadgeModule
  ],
  templateUrl: "./task-list.component.html",
  styleUrls: ["./task-list.component.less"],
})
export class TaskListComponent {

  readonly state = inject(TaskStateService);

  keyword = this.state.keyword;
  loading = this.state.loading;
  error = this.state.error;
  list = this.state.listVM;
  selectedId = this.state.selectedTaskId
  projectId = this.state.projectId;

  badge(status: TaskRuntime["status"] | undefined): string {
    return status ?? "";
  }
}
