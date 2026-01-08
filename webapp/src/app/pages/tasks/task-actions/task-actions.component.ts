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
        <span nz-icon [nzType]="isRunning?'stop':'play-circle'"></span> 运行
      </button>
      <!-- <button nz-button  [disabled]="disabled || !isRunning" (click)="stop.emit()">
        <span nz-icon nzType="stop"></span> 停止
      </button> -->
      <!-- <button nz-button [disabled]="disabled" (click)="log.emit()">
        <span nz-icon nzType="file-text"></span> 日志
      </button> -->
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
  // @Output() stop = new EventEmitter<void>();
  // @Output() log = new EventEmitter<void>();
}
