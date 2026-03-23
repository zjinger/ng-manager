import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { DataTableComponent } from '../../../shared/ui/data-table/data-table.component';
import type { SharedConfigEntity } from '../models/shared-config.model';

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [DatePipe, NzButtonModule, DataTableComponent],
  template: `
    <app-data-table>
      <div table-head class="config-table__head">
        <div>配置项</div>
        <div>分类</div>
        <div>范围</div>
        <div>状态</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body>
        @for (item of items(); track item.id) {
          <div class="config-row">
            <div class="config-cell config-cell--title">
              <div class="config-title">{{ item.configName }}</div>
              <div class="config-meta">{{ item.configKey }} · {{ item.valueType }}</div>
            </div>
            <div class="config-cell">{{ item.category || '默认' }}</div>
            <div class="config-cell">{{ item.scope === 'global' ? '全局' : '项目' }}</div>
            <div class="config-cell">{{ item.status === 'active' ? '启用' : '停用' }}</div>
            <div class="config-cell config-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            <div class="config-cell config-cell--actions">
              <button nz-button nzSize="small" (click)="edit.emit(item)">编辑</button>
            </div>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .config-table__head,
      .config-row {
        display: grid;
        grid-template-columns: 2fr 1fr 0.8fr 0.8fr 0.9fr 0.7fr;
        gap: 16px;
        align-items: center;
      }
      .config-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .config-row {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      .config-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .config-title {
        font-weight: 700;
        color: var(--text-heading);
      }
      .config-meta,
      .config-cell--muted {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .config-cell--actions {
        display: flex;
        justify-content: flex-end;
      }
      @media (max-width: 1100px) {
        .config-table__head {
          display: none;
        }
        .config-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigListComponent {
  readonly items = input<SharedConfigEntity[]>([]);
  readonly edit = output<SharedConfigEntity>();
}
