import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-config-change-bar-component',
  imports: [
    CommonModule
  ],
  template: `
    @if(dirty){
      <div class="change-bar">
        <span>有未保存更改</span>

        <button nz-button (click)="diff.emit()">Diff</button>
        <button nz-button (click)="reset.emit()">重置</button>
        <button nz-button nzType="primary" (click)="save.emit()">保存</button>
      </div>
    }
  `,
  styles: [],
})
export class ConfigChangeBarComponent {
  @Input() dirty = false;
  @Output() diff = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
