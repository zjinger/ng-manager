import { Component, computed } from '@angular/core';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { signal } from '@angular/core';
// import { TasksApiService } from './services/tasks-api.service';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from './task-list/task-list.component';
import { TasksFacadeService } from './services/tasks.facade.service';
import { TaskRow } from '@models/task.model';
import { TaskActionsComponent } from './task-actions/task-actions.component';
import { TaskStatusBadgeComponent } from './task-status-badge/task-status-badge.component';
import { TaskLogDrawerComponent } from './task-log-drawer/task-log-drawer.component';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-tasks',
  imports: [
    CommonModule,
    FormsModule,
    NzSpaceModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,
    NzTableModule,
    NzCardModule,
    NzTagModule,
    TaskConsoleComponent,
    TaskListComponent,
    TaskActionsComponent,
    TaskStatusBadgeComponent,
    TaskLogDrawerComponent
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.less',
})
export class TasksComponent {
  readonly keyword = signal("");
  readonly projectId = signal("default");

  constructor(public readonly facade: TasksFacadeService) {
    this.facade.load(this.projectId());
  }

  readonly rows = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    const list = this.facade.rows();
    if (!kw) return list;
    return list.filter(r =>
      (r.def.name + " " + r.def.id).toLowerCase().includes(kw)
    );
  });

  refresh() {
    this.facade.load(this.projectId());
  }

  openLog(row: TaskRow) {
    this.facade.openLog(row.def.id);
  }

}
