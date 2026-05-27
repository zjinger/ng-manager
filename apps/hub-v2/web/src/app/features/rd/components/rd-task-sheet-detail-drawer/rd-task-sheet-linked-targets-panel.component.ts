import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PanelCardComponent, StatusBadgeComponent } from '@shared/ui';
import type { RdTaskSheetLinkedTargetEntity } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-linked-targets-panel',
  standalone: true,
  imports: [PanelCardComponent, StatusBadgeComponent],
  template: `
    <app-panel-card title="关联跟踪项" [count]="targets().length" [empty]="targets().length === 0" emptyText="暂无关联研发项或测试单">
      <div class="target-list">
        @for (target of targets(); track target.id) {
          <div class="target-item">
            <div class="target-item__main">
              <span class="target-item__type">{{ target.targetType === 'rd_item' ? '研发项' : '测试单' }}</span>
              <strong>{{ target.targetNo || target.targetId }}</strong>
              <span>{{ target.title || '-' }}</span>
            </div>
            <app-status-badge
              [status]="target.completed ? 'completed' : 'processing'"
              [label]="target.completed ? '已完成' : '未完成'"
            />
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .target-list {
        display: grid;
      }
      .target-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .target-item:last-child {
        border-bottom: 0;
      }
      .target-item__main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: var(--text-secondary);
        font-size: 13px;
      }
      .target-item__main strong,
      .target-item__main span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .target-item__main strong {
        color: var(--primary-700);
        font-weight: 700;
      }
      .target-item__type {
        flex: 0 0 auto;
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetLinkedTargetsPanelComponent {
  readonly targets = input<RdTaskSheetLinkedTargetEntity[]>([]);
}
