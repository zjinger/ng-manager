import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpaceModule } from 'ng-zorro-antd/space';
@Component({
  selector: 'app-task-actions',
  imports: [NzSpaceModule, NzButtonModule, NzIconModule, NzPopconfirmModule],
  template: `
    <nz-space>
    @if(isStopped){
        <button
          nz-button
          nzType="primary"
          (click)="toggle.emit()"
        >
          <span nz-icon nzType="play-circle"></span> 运行
        </button>
    }
    @else if(isStopping){
      <button
        nz-button
        nzType="primary"
        nzDanger
      >
      <span nz-icon nzType="loading"></span> 停止中...
      </button>
    } 
    @else if(isRunning){
      <button
        nz-button
        nzType="primary"
        nzDanger
        nz-popconfirm
        nzPopconfirmTitle="确定要停止该任务吗？"
        (nzOnConfirm)="stopTask()"
      >
        <span nz-icon nzType="pause"></span> 停止
      </button>
    }
    
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
  @Input() isStopping = false;
  @Input() isStopped = false;
  @Output() toggle = new EventEmitter<void>();

  stopTask() {
    this.toggle.emit();
  }
}
