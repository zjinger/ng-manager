import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ActivityTimelineComponent } from '@shared/ui';
import type { RdAction, RdItemEntity, RdLogEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-activity-timeline',
  standalone: true,
  imports: [ActivityTimelineComponent],
  template: `
    <app-activity-timeline
      [title]="'研发动态 · v' + item().version"
      [emptyText]="'暂无动态'"
      [items]="timelineItems()"
      [bodyMaxHeight]="420"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdActivityTimelineComponent {
  readonly item = input.required<RdItemEntity>();
  readonly logs = input<RdLogEntity[]>([]);

  readonly timelineItems = computed(() => {
    const logs = this.logs();
    if (logs.length === 0) {
      return [];
    }
    return logs.map((log) => ({
      id: log.id,
      icon: this.iconByAction(log.actionType),
      actor: log.operatorName || log.operatorId || '系统',
      action: log.content?.trim() || this.labelByAction(log.actionType),
      time: this.formatTime(log.createdAt),
    }));
  });

  private labelByAction(action: RdAction): string {
    return (
      {
        create: '创建研发项',
        update: '更新研发项',
        start: '开始执行',
        block: '标记阻塞',
        resume: '恢复执行',
        reopen: '恢复研发项',
        complete: '标记完成',
        accept: '验收完成',
        close: '关闭研发项',
        advance_stage: '进入下一阶段',
        delete: '删除研发项',
      }[action] ?? action
    );
  }

  private iconByAction(action: RdAction): string {
    return (
      {
        create: 'plus-circle',
        update: 'edit',
        start: 'play-circle',
        block: 'pause-circle',
        resume: 'redo',
        reopen: 'rollback',
        complete: 'check-circle',
        accept: 'safety-certificate',
        close: 'close-circle',
        advance_stage: 'right-circle',
        delete: 'delete',
      }[action] ?? 'history'
    );
  }

  private formatTime(value: string): string {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }
}
