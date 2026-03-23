import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { PriorityBadgeComponent } from '../../../../shared/ui/priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-list-table',
  standalone: true,
  imports: [DatePipe, NzButtonModule, DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent],
  template: `
    <app-data-table>
      <div table-head class="rd-table__head">
        <div>研发项</div>
        <div>阶段</div>
        <div>状态</div>
        <div>优先级</div>
        <div>负责人</div>
        <div>进度</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body class="rd-table__body">
        @for (item of items(); track item.id) {
          <div class="rd-row" [class.is-active]="selectedItemId() === item.id" (click)="selectItem.emit(item)">
            <div class="rd-cell">
              <div class="rd-name">{{ item.title }}</div>
              <div class="rd-meta">{{ item.rdNo }}</div>
            </div>
            <div class="rd-cell">{{ stageName(item.stageId) }}</div>
            <div class="rd-cell"><app-status-badge [status]="item.status" [label]="statusLabel(item.status)" /></div>
            <div class="rd-cell"><app-priority-badge [priority]="item.priority" /></div>
            <div class="rd-cell">{{ item.assigneeName || '未指派' }}</div>
            <div class="rd-cell rd-cell--muted">{{ item.progress }}%</div>
            <div class="rd-cell rd-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            <div class="rd-cell rd-cell--actions">
              @for (action of actionsFor(item); track action.key) {
                <button
                  nz-button
                  nzSize="small"
                  [nzType]="action.primary ? 'primary' : 'default'"
                  (click)="$event.stopPropagation(); actionClick.emit({ item, action: action.key })"
                >
                  {{ action.label }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .rd-table__head,
      .rd-row {
        display: grid;
        grid-template-columns: 1.8fr 0.9fr 0.9fr 0.8fr 0.9fr 0.7fr 0.9fr 1fr;
        gap: 16px;
        align-items: center;
      }
      .rd-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .rd-row {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .rd-row:hover {
        background: var(--bg-subtle);
      }
      .rd-row.is-active {
        background: color-mix(in srgb, var(--primary-500) 8%, transparent);
      }
      .rd-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .rd-name {
        font-weight: 700;
        color: var(--text-heading);
      }
      .rd-meta,
      .rd-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }
      .rd-cell--actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      @media (max-width: 1100px) {
        .rd-table__head {
          display: none;
        }
        .rd-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdListTableComponent {
  readonly items = input<RdItemEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly selectedItemId = input<string | null>(null);
  readonly actionClick = output<{ item: RdItemEntity; action: 'start' | 'block' | 'resume' | 'complete' | 'accept' | 'close' }>();
  readonly selectItem = output<RdItemEntity>();

  stageName(stageId: string | null): string {
    return this.stages().find((item) => item.id === stageId)?.name ?? '未归类';
  }

  statusLabel(status: string): string {
    return (
      {
        todo: '待开始',
        doing: '开发中',
        blocked: '阻塞中',
        done: '待验收',
        accepted: '已验收',
        closed: '已关闭',
      }[status] ?? status
    );
  }

  actionsFor(item: RdItemEntity) {
    switch (item.status) {
      case 'todo':
        return [{ key: 'start' as const, label: '开始', primary: true }];
      case 'doing':
        return [
          { key: 'block' as const, label: '阻塞', primary: false },
          { key: 'complete' as const, label: '完成', primary: true },
        ];
      case 'blocked':
        return [{ key: 'resume' as const, label: '继续', primary: true }];
      case 'done':
        return [{ key: 'accept' as const, label: '验收', primary: true }];
      case 'accepted':
        return [{ key: 'close' as const, label: '关闭', primary: false }];
      default:
        return [];
    }
  }
}
