import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { RdLogEntity } from '@pages/rd/models/rd.model';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

@Component({
  selector: 'app-rd-logs-area',
  imports: [DetailItemCardComponent, NzTimelineModule, CommonModule],
  template: `
    <app-detail-item-card
      title="研发动态"
      maxHeight="600px"
      [emptyStatus]="logs().length === 0"
      [emptyText]="'暂无动态'"
    >
      <nz-timeline>
        @for (log of logs(); track log.id) {
          <nz-timeline-item>
            <div class="rd-log-item">
              <div class="meta">
                <span class="operator">{{ log.operatorName || '系统' }}</span>
                <span class="content">{{ log.content || log.actionType }}</span>
                <span class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</span>
              </div>
            </div>
          </nz-timeline-item>
        }
      </nz-timeline>
    </app-detail-item-card>
  `,
  styles: `
    .rd-log-item {
      padding: 4px 0 0;
      .meta {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        color: rgba(0, 0, 0, 0.65);
        font-size: 1rem;
        margin-bottom: 4px;
        .operator {
          font-weight: bold;
          white-space: nowrap; /* 不换行 */
          flex-shrink: 0; /* 禁止被压缩 */
        }
        .content {
          color: rgba(0, 0, 0, 0.85);
          font-size: 0.875rem;
        }
        .time {
          margin-right: 15px;
          font-size: 0.875rem;
          font-weight: 300;
          color: #bbbbbb;
          margin-left: auto;
          white-space: nowrap; /* 不换行 */
          flex-shrink: 0; /* 禁止被压缩 */
        }
      }
    }
  `,
})
export class RdLogsAreaComponent {
  readonly logs = input<RdLogEntity[]>([]);
}
