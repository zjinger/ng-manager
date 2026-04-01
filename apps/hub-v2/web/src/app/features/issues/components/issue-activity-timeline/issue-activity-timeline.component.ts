import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ActivityTimelineComponent } from '@shared/ui';
import type { IssueLogEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-activity-timeline',
  standalone: true,
  imports: [ActivityTimelineComponent],
  template: `
    <app-activity-timeline [items]="timelineItems()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueActivityTimelineComponent {
  readonly logs = input.required<IssueLogEntity[]>();
  readonly timelineItems = computed(() =>
    this.logs().map((item) => ({
      id: item.id,
      icon: this.iconType(item),
      actor: item.operatorName || '系统',
      action: this.logText(item),
      time: new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(item.createdAt)),
    })),
  );

  private iconType(item: IssueLogEntity): string {
    const metaKind = this.readMetaKind(item.metaJson);
    if (metaKind === 'participant.added' || metaKind === 'participant.added.batch') {
      return 'user-add';
    }
    if (metaKind === 'participant.removed') {
      return 'user-delete';
    }

    const actionType = item.actionType;
    return (
      {
        create: 'plus-circle',
        assign: 'user-add',
        claim: 'user-add',
        start: 'play-circle',
        resolve: 'check-circle',
        verify: 'safety-certificate',
        reopen: 'redo',
        close: 'close-circle',
        comment: 'message',
        update: 'edit',
      }[actionType] || 'clock-circle'
    );
  }

  private logText(item: IssueLogEntity): string {
    return item.summary || item.actionType;
  }

  private readMetaKind(metaJson: string | null): string | null {
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as { kind?: unknown };
      return typeof parsed.kind === 'string' ? parsed.kind : null;
    } catch {
      return null;
    }
  }
}
