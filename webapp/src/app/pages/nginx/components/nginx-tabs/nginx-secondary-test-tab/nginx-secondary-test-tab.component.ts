import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { LogEntry, NginxLogViewerComponent } from '../../nginx-log-viewer/nginx-log-viewer.component';

@Component({
  selector: 'app-nginx-secondary-test-tab',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NginxLogViewerComponent],
  template: `
    <div class="panel-header-row">
      <span class="panel-tip">验证 Nginx 配置文件语法正确性</span>
      <button
        nz-button
        nzType="default"
        nzSize="small"
        class="run-test-btn"
        (click)="runTest.emit()"
        [nzLoading]="loading"
      >
        <nz-icon nzType="check-circle" nzTheme="outline"></nz-icon>
        执行检测
      </button>
    </div>
    <app-nginx-log-viewer
      [title]="'结果'"
      [status]="'✓ syntax is ok'"
      statusTone="ok"
      [logs]="logs"
      [maxHeight]="180"
    ></app-nginx-log-viewer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .panel-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .panel-tip {
      font-size: var(--nginx-font-size-base, 14px);
      color: var(--text-2);
    }

    .run-test-btn {
      background: var(--green);
      color: #fff;
      border-color: var(--green);
      font-weight: 600;
      min-height: 28px;
      padding-inline: 10px;

      &:hover,
      &:focus {
        background: #00a122;
        border-color: #00a122;
        color: #fff;
      }
    }

    @media (max-width: 992px) {
      .panel-header-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class NginxSecondaryTestTabComponent {
  @Input() loading = false;
  @Input() logs: LogEntry[] = [];
  @Output() runTest = new EventEmitter<void>();
}

