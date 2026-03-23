import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import { PriorityBadgeComponent } from '../../../../shared/ui/priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-props-panel',
  standalone: true,
  imports: [DatePipe, PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent],
  template: `
    <app-panel-card title="研发项属性">
      <dl class="props">
        <div>
          <dt>状态</dt>
          <dd><app-status-badge [status]="item().status" [label]="statusLabel(item().status)" /></dd>
        </div>
        <div>
          <dt>优先级</dt>
          <dd><app-priority-badge [priority]="item().priority" /></dd>
        </div>
        <div>
          <dt>阶段</dt>
          <dd>{{ stageName(item().stageId) }}</dd>
        </div>
        <div>
          <dt>执行人</dt>
          <dd>{{ item().assigneeName || '未指派' }}</dd>
        </div>
        <div>
          <dt>验收人</dt>
          <dd>{{ item().reviewerName || '未指定' }}</dd>
        </div>
        <div>
          <dt>进度</dt>
          <dd>{{ item().progress }}%</dd>
        </div>
        <div>
          <dt>计划开始</dt>
          <dd class="meta-cell">{{ item().planStartAt ? (item().planStartAt | date: 'yyyy-MM-dd') : '未设置' }}</dd>
        </div>
        <div>
          <dt>计划结束</dt>
          <dd class="meta-cell">{{ item().planEndAt ? (item().planEndAt | date: 'yyyy-MM-dd') : '未设置' }}</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd class="meta-cell">{{ item().createdAt | date: 'yyyy-MM-dd HH:mm' }}</dd>
        </div>
      </dl>
    </app-panel-card>
  `,
  styles: [
    `
      .props {
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
      }
      .props div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      dt {
        color: var(--text-muted);
      }
      dd {
        margin: 0;
        color: var(--text-primary);
        font-weight: 600;
        text-align: right;
      }
      .meta-cell {
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdPropsPanelComponent {
  readonly item = input.required<RdItemEntity>();
  readonly stages = input<RdStageEntity[]>([]);

  stageName(stageId: string | null): string {
    return this.stages().find((stage) => stage.id === stageId)?.name ?? '未归类';
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
}
