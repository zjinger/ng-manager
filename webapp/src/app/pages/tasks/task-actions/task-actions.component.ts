import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpaceModule } from 'ng-zorro-antd/space';

@Component({
  selector: 'app-task-actions',
  imports: [NzSpaceModule, NzButtonModule],
  templateUrl: './task-actions.component.html',
  styleUrl: './task-actions.component.less',
})
export class TaskActionsComponent {
  @Input() isRunning = false;
  @Input() disabled = false;

  @Output() run = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() log = new EventEmitter<void>();
}
