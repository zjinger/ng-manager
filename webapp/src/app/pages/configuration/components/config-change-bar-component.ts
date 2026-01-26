import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-config-change-bar-component',
  imports: [
    CommonModule,
    NzButtonModule,
  ],
  template: `
    @if(dirty){
      <div class="change-bar">
         <span class="hint">有未保存更改</span>
        <button nz-button (click)="diff.emit()">Diff</button>
        <button nz-button (click)="reset.emit()">重置</button>
        <button nz-button nzType="primary" (click)="save.emit()">保存</button>
      </div>
    }
  `,
  styles: [
    `
    .change-bar {
      width: 100%;
      padding: 10px 20px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
      background: var(--app-component-bg);
      border: 1px solid var(--app-border-color);
    }
    .hint { margin-right: auto; opacity: .75; }
    `
  ],
})
export class ConfigChangeBarComponent {
  @Input() dirty = false;
  @Output() diff = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
