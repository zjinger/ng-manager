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
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;

  readonly logs = input.required<IssueLogEntity[]>();
  readonly timelineItems = computed(() =>
    this.logs().map((item) => {
      const action = this.logText(item);
      return {
        id: item.id,
        icon: this.iconType(item),
        actor: item.operatorName || '系统',
        action,
        actionSegments: this.highlightMentionSegments(action),
        time: new Intl.DateTimeFormat('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(item.createdAt)),
      };
    }),
  );

  private iconType(item: IssueLogEntity): string {
    const metaKind = this.readMetaKind(item.metaJson);
    if (metaKind === 'participant.added' || metaKind === 'participant.added.batch') {
      return 'user-add';
    }
    if (metaKind === 'participant.removed') {
      return 'user-delete';
    }
    if (metaKind === 'issue_branch.created' || metaKind === 'issue_branch.claimed') {
      return 'share-alt';
    }
    if (metaKind === 'issue_branch.started') {
      return 'play-circle';
    }
    if (metaKind === 'issue_branch.completed') {
      return 'check-circle';
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

  // Split log text into plain and @mention segments for timeline highlighting.
  private highlightMentionSegments(text: string): Array<{ text: string; mention?: boolean }> | undefined {
    if (!text || !text.includes('@')) {
      return undefined;
    }
    const parts = text.split(this.mentionPattern).filter((part) => part.length > 0);
    if (parts.length <= 1) {
      return undefined;
    }
    return parts.map((part) => ({
      text: part,
      mention: part.startsWith('@'),
    }));
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
