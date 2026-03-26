import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzProgressModule } from 'ng-zorro-antd/progress';

import { RD_STATUS_LABELS } from '@shared/constants';
import { DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent } from '@shared/ui';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-list-table',
  standalone: true,
  imports: [DatePipe, NzProgressModule, DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent],
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
            <div class="rd-cell rd-cell--progress">
              <nz-progress
                [nzPercent]="item.progress"
                [nzShowInfo]="true"
                [nzStrokeWidth]="6"
                [nzSize]="'small'"
              ></nz-progress>
            </div>
            <div class="rd-cell rd-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
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
        grid-template-columns: 2fr 1fr 1fr 0.8fr 0.8fr 1fr 0.8fr;
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
        border-bottom: 1px solid var(--border-color-soft);
        cursor: pointer;
        transition: var(--transition-base);
      }
      .rd-row:last-child {
        border-bottom: 0;
      }
      .rd-row:hover {
        background: var(--bg-subtle);
      }
      .rd-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }
      .rd-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .rd-cell--progress {
        min-width: 140px;
      }
      .rd-cell--progress :where(.ant-progress-text) {
        color: var(--text-muted);
      }
      .rd-name {
        font-weight: 700;
        color: var(--text-heading);
      }
      .rd-meta,
      .rd-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
        padding-left: 12px;
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
      :host-context(html[data-theme='dark']) .rd-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdListTableComponent {
  readonly items = input<RdItemEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly selectedItemId = input<string | null>(null);
  readonly selectItem = output<RdItemEntity>();

  stageName(stageId: string | null): string {
    return this.stages().find((item) => item.id === stageId)?.name ?? '未归类';
  }

  statusLabel(status: string): string {
    return RD_STATUS_LABELS[status] ?? status;
  }
}
