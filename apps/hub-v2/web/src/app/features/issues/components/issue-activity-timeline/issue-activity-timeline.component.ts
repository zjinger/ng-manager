import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '@shared/ui';
import type { IssueLogEntity } from '../../models/issue.model';
import { IssueDetailNoteComponent } from '../issue-detail-note/issue-detail-note.component';
import { NzImageModule } from 'ng-zorro-antd/image';

interface IssueTimelineItem {
  id: string;
  icon: string;
  actionType: string;
  actor: string;
  action: string;
  actionSegments?: Array<{ text: string; mention?: boolean }>;
  imageItems: Array<{ alt: string; url: string }>;
  time: string;
}

@Component({
  selector: 'app-issue-activity-timeline',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzSelectModule, PanelCardComponent, IssueDetailNoteComponent, NzImageModule],
  templateUrl: './issue-activity-timeline.component.html',
  styleUrl: './issue-activity-timeline.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueActivityTimelineComponent {
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;
  private readonly markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  readonly selectedFilter = signal<string>('all');

  readonly logs = input.required<IssueLogEntity[]>();
  readonly showFilter = computed(() => this.logs().length > 10);
  readonly timelineItems = computed<IssueTimelineItem[]>(() =>
    this.logs().map((item) => {
      const rawAction = this.logText(item);
      const markdownImages = this.extractInlineImages(rawAction);
      const actionWithoutMarkdownImages = this.stripInlineImages(rawAction);
      const plainUrlImages = this.extractPlainImageUrls(actionWithoutMarkdownImages);
      const imageItems = this.mergeImageItems(markdownImages, plainUrlImages);
      const action = this.stripPlainImageUrls(actionWithoutMarkdownImages);
      const normalizedAction = action.trim() || (imageItems.length > 0 ? '上传了图片' : action);

      return {
        id: item.id,
        icon: this.iconType(item),
        actionType: item.actionType,
        actor: item.operatorName || '系统',
        action: normalizedAction,
        actionSegments: this.highlightMentionSegments(normalizedAction),
        imageItems,
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
  readonly filterOptions = computed(() => {
    const uniqueActionTypes = Array.from(
      new Set(this.timelineItems().map((item) => item.actionType).filter((type) => !!type?.trim())),
    );
    return [
      { value: 'all', label: '全部' },
      ...uniqueActionTypes.map((type) => ({ value: type, label: this.actionTypeLabel(type) })),
    ];
  });
  readonly filteredTimelineItems = computed(() => {
    const selected = this.selectedFilter();
    const all = this.timelineItems();
    const hasSelected = this.filterOptions().some((item) => item.value === selected);
    if (selected === 'all' || !hasSelected) {
      return all;
    }
    return all.filter((item) => item.actionType === selected);
  });

  onFilterModelChange(value: string): void {
    const next = value?.trim() || 'all';
    const hasOption = this.filterOptions().some((item) => item.value === next);
    this.selectedFilter.set(hasOption ? next : 'all');
  }

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

    return (
      {
        create: 'plus-circle',
        urge: 'bell',
        assign: 'user-add',
        claim: 'user-add',
        start: 'play-circle',
        wait_update: 'clock-circle',
        resolve: 'check-circle',
        verify: 'safety-certificate',
        reopen: 'redo',
        close: 'close-circle',
        comment: 'message',
        update: 'edit',
      }[item.actionType] || 'clock-circle'
    );
  }

  private logText(item: IssueLogEntity): string {
    const reason = this.readMetaReason(item.metaJson);
    if (item.actionType === 'resolve' && reason) {
      return `标记问题已解决：${reason}`;
    }
    if (item.actionType === 'reopen' && reason) {
      return `重新打开问题：${reason}`;
    }
    if (item.actionType === 'close' && reason) {
      return `关闭问题：${reason}`;
    }
    return item.summary || item.actionType;
  }

  private actionTypeLabel(actionType: string): string {
    return (
      {
        create: '创建',
        urge: '置顶提醒',
        assign: '指派',
        claim: '认领',
        start: '开始处理',
        wait_update: '待提测',
        resolve: '标记解决',
        verify: '验证通过',
        reopen: '重新打开',
        close: '关闭',
        comment: '评论',
        update: '更新',
      }[actionType] || actionType
    );
  }

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
    const parsed = this.parseMeta(metaJson);
    return typeof parsed?.['kind'] === 'string' ? parsed['kind'] : null;
  }

  private readMetaReason(metaJson: string | null): string | null {
    const parsed = this.parseMeta(metaJson);
    if (!parsed) {
      return null;
    }
    const reason = typeof parsed['reason'] === 'string' ? parsed['reason'].trim() : '';
    return reason || null;
  }

  private parseMeta(metaJson: string | null): Record<string, unknown> | null {
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private extractInlineImages(text: string): Array<{ alt: string; url: string }> {
    const result: Array<{ alt: string; url: string }> = [];
    for (const match of text.matchAll(this.markdownImagePattern)) {
      const alt = (match[1] || '').trim();
      const url = (match[2] || '').trim();
      if (!url) {
        continue;
      }
      result.push({ alt, url });
    }
    return result;
  }

  private stripInlineImages(text: string): string {
    return text.replace(this.markdownImagePattern, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  private extractPlainImageUrls(text: string): Array<{ alt: string; url: string }> {
    const lines = text.split(/\r?\n/);
    const result: Array<{ alt: string; url: string }> = [];
    for (const line of lines) {
      const url = line.trim();
      if (!this.isLikelyImageUrl(url)) {
        continue;
      }
      result.push({ alt: 'image', url });
    }
    return result;
  }

  private stripPlainImageUrls(text: string): string {
    return text
      .split(/\r?\n/)
      .filter((line) => !this.isLikelyImageUrl(line.trim()))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private mergeImageItems(
    first: Array<{ alt: string; url: string }>,
    second: Array<{ alt: string; url: string }>
  ): Array<{ alt: string; url: string }> {
    const seen = new Set<string>();
    const merged: Array<{ alt: string; url: string }> = [];
    for (const item of [...first, ...second]) {
      const key = item.url.trim();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(item);
    }
    return merged;
  }

  private isLikelyImageUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    if (!/^https?:\/\/[^\s]+$/i.test(url) && !/^\/[^\s]+$/.test(url)) {
      return false;
    }
    if (/\/api\/admin\/uploads\/[^/]+\/raw(?:$|\?)/i.test(url)) {
      return true;
    }
    return /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/i.test(url);
  }
}
