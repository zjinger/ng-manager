import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutComponent, NzLayoutModule } from "ng-zorro-antd/layout";
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TaskStateService } from './services/tasks.state.service';
import { TaskActionsComponent } from './task-actions/task-actions.component';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { TaskHeaderComponent } from './task-header/task-header.component';
import { TaskListComponent } from './task-list/task-list.component';
import { TaskLogDrawerComponent } from './task-log/task-log.component';
// import { TaskStatusBadgeComponent } from './task-status-badge/task-status-badge.component';

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
    NzIconModule,
    NzLayoutModule,
    TaskConsoleComponent,
    TaskListComponent,
    TaskActionsComponent,
    TaskHeaderComponent,
    // TaskStatusBadgeComponent,
    TaskLogDrawerComponent,
    NzLayoutComponent
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.less',
})
export class TasksComponent {
  projectState = inject(ProjectStateService);
  taskState = inject(TaskStateService);

  selectedTask = this.taskState.selectedRow;


  constructor() {
    // currentProjectId 变化时，自动 setProject + refresh
    effect(() => {
      const pid = this.projectState.currentProjectId();
      if (pid) this.taskState.setProject(pid);
    });
  }
}
