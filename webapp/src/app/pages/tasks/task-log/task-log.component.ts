import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TaskLogLine } from '@models/task.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TaskStateService } from '../services/tasks.state.service';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-task-log',
  imports: [
    CommonModule,
    NzTagModule,
    NzDrawerModule,
    NzButtonModule,
    NzSpaceModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule
  ],
  templateUrl: './task-log.component.html',
  styleUrl: './task-log.component.less',
})
export class TaskLogDrawerComponent {
  readonly state = inject(TaskStateService);
  lines = this.state.logLines
}
