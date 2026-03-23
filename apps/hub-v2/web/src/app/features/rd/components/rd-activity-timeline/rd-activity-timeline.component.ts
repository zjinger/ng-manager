import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ActivityTimelineComponent } from '../../../../shared/ui/activity-timeline/activity-timeline.component';
import type { RdItemEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-activity-timeline',
  standalone: true,
  imports: [ActivityTimelineComponent],
  template: `
    <app-activity-timeline [title]="'研发动态'" [emptyText]="'暂无动态'" [items]="timelineItems()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdActivityTimelineComponent {
  readonly item = input.required<RdItemEntity>();

  readonly timelineItems = computed(() => {
    const item = this.item();
    const events = [
      { id: `${item.id}-created`, icon: 'plus-circle', actor: item.creatorName || '系统', action: '创建了研发项', time: item.createdAt },
      item.actualStartAt
        ? { id: `${item.id}-started`, icon: 'play-circle', actor: item.assigneeName || item.creatorName || '系统', action: '开始执行', time: item.actualStartAt }
        : null,
      item.blockerReason
        ? { id: `${item.id}-blocked`, icon: 'pause-circle', actor: item.assigneeName || item.creatorName || '系统', action: `标记阻塞：${item.blockerReason}`, time: item.updatedAt }
        : null,
      item.actualEndAt
        ? { id: `${item.id}-completed`, icon: 'check-circle', actor: item.assigneeName || item.creatorName || '系统', action: '标记完成', time: item.actualEndAt }
        : null,
      item.status === 'accepted'
        ? { id: `${item.id}-accepted`, icon: 'safety-certificate', actor: item.reviewerName || '系统', action: '完成验收', time: item.updatedAt }
        : null,
      item.status === 'closed'
        ? { id: `${item.id}-closed`, icon: 'close-circle', actor: item.reviewerName || item.creatorName || '系统', action: '关闭研发项', time: item.updatedAt }
        : null,
    ].filter(Boolean) as Array<{ id: string; icon: string; actor: string; action: string; time: string }>;

    return events.map((event) => ({
      ...event,
      time: new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(event.time)),
    }));
  });
}
