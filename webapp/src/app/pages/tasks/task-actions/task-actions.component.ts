import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpaceModule } from 'ng-zorro-antd/space';

@Component({
  selector: 'app-task-actions',
  imports: [NzSpaceModule, NzButtonModule, NzIconModule],
  template: `
    <nz-space>
      <button
        nz-button
        nzType="primary"
        (click)="toggle.emit()"
        [nzDanger]="isRunning"
        [disabled]="disabled"
      >
        <span nz-icon [nzType]="isRunning?'pause':'play-circle'"></span> {{ isRunning ? '停止' : '运行' }}
      </button>
    </nz-space>
  `,
  styles: [
    `
      :host {
        padding: 0 16px;
        display: flex;
        flex-direction: row;
        align-items: center;
        position: relative;
      }
    `
  ],
})
export class TaskActionsComponent {
  @Input() isRunning = false;
  @Input() disabled = false;

  @Output() toggle = new EventEmitter<void>();
}
