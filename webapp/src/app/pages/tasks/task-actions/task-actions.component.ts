import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskRow } from '@models/task.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpaceModule } from 'ng-zorro-antd/space';

@Component({
  selector: 'app-task-actions',
  imports: [NzSpaceModule, NzButtonModule],
  templateUrl: './task-actions.component.html',
  styleUrl: './task-actions.component.less',
})
export class TaskActionsComponent {
  @Input() row!: TaskRow;
  @Output() run = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() log = new EventEmitter<void>();

  get isRunning() { return this.row?.rt.status === "running"; }
}
