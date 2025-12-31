import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskLogLine } from '@models/task.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-task-log-drawer',
  imports: [CommonModule, NzDrawerModule, NzButtonModule, NzSpaceModule, NzTagModule],
  templateUrl: './task-log-drawer.component.html',
  styleUrl: './task-log-drawer.component.less',
})
export class TaskLogDrawerComponent {
  @Input() open = false;
  @Input() taskId = "";
  @Input() lines: TaskLogLine[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
}
