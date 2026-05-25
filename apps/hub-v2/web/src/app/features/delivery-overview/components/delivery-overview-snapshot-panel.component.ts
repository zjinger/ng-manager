import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelCardComponent } from '@shared/ui';

import type { DeliveryOverviewVm } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-snapshot-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    <app-panel-card title="当前快照">
      <div class="snapshot-list">
        <div><span>项目状态</span><strong>{{ vm().headline }}</strong></div>
        <div><span>研发进度</span><strong>整体完成 {{ vm().progress }}%，{{ vm().completedCount }} 项已完成。</strong></div>
        <div><span>测试风险</span><strong>未关闭测试单 {{ vm().unfinishedIssueCount }} 条。</strong></div>
        <div><span>当前重点</span><strong>{{ vm().nextStep }}</strong></div>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .snapshot-list {
        display: grid;
        gap: 14px;
        padding: 16px;
      }
      .snapshot-list > div {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr);
        gap: 10px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .snapshot-list > div:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      span {
        color: var(--text-muted);
      }
      strong {
        color: var(--text-heading);
        line-height: 1.5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewSnapshotPanelComponent {
  readonly vm = input.required<DeliveryOverviewVm>();
}
