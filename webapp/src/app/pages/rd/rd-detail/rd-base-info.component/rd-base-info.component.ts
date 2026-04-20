import { Component, input } from '@angular/core';
import { PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  RdItemEntity,
  RdItemPriority,
  RdItemStatus,
  RdStageEntity,
} from '@pages/rd/models/rd.model';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';

@Component({
  selector: 'app-rd-base-info',
  imports: [NzDescriptionsModule, DetailItemCardComponent],
  template: `
    <app-detail-item-card title="研发项描述">
      @if (rdItem(); as rdItem) {
        <nz-descriptions nzBordered nzSize="small"  [nzColumn]="1">
          <nz-descriptions-item nzTitle="执行人">
            {{ rdItem.assigneeName }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="验收人">
            {{ rdItem.creatorName }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="进度"> {{ rdItem.progress }}% </nz-descriptions-item>
          <nz-descriptions-item nzTitle="状态">
            {{ getStatusLabel(rdItem.status) }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="优先级">
            {{ getPriorityLabel(rdItem.priority) }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="阶段">
            {{ getStagesName(rdItem.stageId) }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="进度"> {{ rdItem.progress }} % </nz-descriptions-item>
        </nz-descriptions>
      }
    </app-detail-item-card>
  `,
  styleUrl: './rd-base-info.component.less',
})
export class RdBaseInfoComponent {
  readonly rdItem = input<RdItemEntity>();
  readonly stages = input<RdStageEntity[]>([]);

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }
  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }
}
