import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
@Component({
  selector: 'app-task-header',
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="name"><nz-icon nzType="appstore"></nz-icon> {{ name || '未选择任务' }}</div>
    <div class="description">{{ description || '-' }}</div>
    <div class="command">{{ command || '-' }}</div>
  `,
  styles: [
    `
      :host {
        display: flex;
        padding: 0 16px;
        display: flex;
        flex-direction: row;
        align-items: center;
        .name {
          font-size: 22px;
          position: relative;
          top: -1px;
        }
        .description {
          flex: 1;
          color: var(--app-text-secondary);
          font-size: 15px;
          margin: 0 16px;
          overflow: hidden;
          -ms-text-overflow: ellipsis;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .command {
          font-family: Roboto Mono, monospace;
          font-size: 13px;
          background:var(--app-primary-3);
          height: 32px;
          line-height: 32px;
          padding: 0 12px;
          border-radius: 3px;
          overflow: hidden;
          -ms-text-overflow: ellipsis;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-sizing: border-box;
        }
      }
    `
  ],
})
export class TaskHeaderComponent {
  @Input() name?: string;
  @Input() description?: string;
  @Input() command?: string;
}
