import { Component, effect, input, output } from '@angular/core';
import {
  IssueEntity,
  IssueListQuery,
  IssuePriority,
  IssueStatus,
  IssueType,
} from '../models/issue.model';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ISSUE_STATUS_COLORS, ISSUE_STATUS_LABELS } from '@app/shared/constants/status-options';
import { RdItemStatus } from '@pages/rd/models/rd.model';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { CommonModule } from '@angular/common';
import { ISSUE_TYPE_COLORS, ISSUE_TYPE_LABELS } from '@app/shared/constants/issue-type-options';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { computed, signal } from '@angular/core';
import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { set } from 'lodash';
import { parseDescriptionImage } from '@app/utils/md-text';

@Component({
  selector: 'app-issues-list-table',
  imports: [
    NzTableModule,
    NzTagModule,
    NzProgressModule,
    NzPopoverModule,
    NzTooltipModule,
    EllipsisTextComponent,
    CommonModule,
  ],
  templateUrl: './issues-list-table.component.html',
  styleUrls: ['./issues-list-table.component.less'],
})
export class IssuesListTableComponent {
  readonly issues = input.required<IssueEntity[]>();
  readonly selectedItem = input<IssueEntity | null>();
  readonly projectId = input<string | null>(null);
  readonly selectItem = output<IssueEntity>();
  readonly loading = input(false);
  readonly query = input.required<IssueListQuery>();

  // hover 预览状态
  readonly hoveredPreview = signal<{
    src: string;
    alt: string;
    left: number;
    top: number;
  } | null>(null);

  // 图片解析缓存
  private readonly imageErrorSet = signal(new Set<string>());

  readonly previewMap = computed(() => {
    const map = new Map<string, { summary: string; imageUrl: string | null; imageAlt: string }>();

    for (const item of this.issues()) {
      map.set(
        item.id,
        parseDescriptionImage(item.description, this.projectId()!, item.id, 'issues'),
      );
    }
    return map;
  });

  // readonly currentTitleOverflowing = signal(false);
  readonly titleOverflowPreview = signal<{ issueId: string; overflowing: boolean } | null>(null);

  getStatusLabel(status: IssueStatus) {
    return ISSUE_STATUS_LABELS[status];
  }

  getStatusColor(status: IssueStatus) {
    return ISSUE_STATUS_COLORS[status];
  }

  getPriorityColor(priority: IssuePriority) {
    return PRIORITY_COLORS[priority];
  }

  getPriorityLabel(priority: IssuePriority) {
    return PRIORITY_LABELS[priority];
  }

  getTypeLabel(type: IssueType) {
    return ISSUE_TYPE_LABELS[type];
  }

  getTypeColor(type: IssueType) {
    return ISSUE_TYPE_COLORS[type];
  }

  participantNamesText(item: IssueEntity): string {
    const names = (item.participantNames ?? []).filter(Boolean);
    if (names.length === 0) {
      return '';
    }
    return names.join('、');
  }

  previewSummary(item: IssueEntity): string {
    return this.previewMap().get(item.id)?.summary || '暂无详细描述';
  }

  previewImageUrl(item: IssueEntity): string | null {
    if (this.imageErrorSet().has(item.id)) {
      return null;
    }
    return this.previewMap().get(item.id)?.imageUrl ?? null;
  }

  markPreviewImageError(item: IssueEntity) {
    this.imageErrorSet.update((set) => {
      return new Set([...set, item.id]);
    });
  }

  showPreview(e: MouseEvent, item: IssueEntity) {
    const data = this.previewMap().get(item.id);

    if (!data?.imageUrl) {
      this.hoveredPreview.set(null);
      return;
    }

    // 如果这个 URL 已经失败过，直接跳过
    if (this.imageErrorSet().has(data.imageUrl)) {
      this.hoveredPreview.set(null);
      return;
    }
    const position = this.calcPosition(e);
    this.hoveredPreview.set({
      src: data.imageUrl!,
      alt: data.imageAlt || item.title,
      ...position,
    });
  }

  onImageError(src: string) {
    const set = new Set(this.imageErrorSet());
    set.add(src);
    this.imageErrorSet.set(set);

    // 关闭当前预览
    this.hoveredPreview.set(null);
  }

  movePreview(e: MouseEvent, item: IssueEntity) {
    if (!this.hoveredPreview()) return;
    this.showPreview(e, item);
  }

  hidePreview() {
    this.hoveredPreview.set(null);
  }

  // 检查标题是否溢出，如果溢出，显示预览
  checkTitleOverflow(item: IssueEntity) {
    return (
      this.titleOverflowPreview()?.issueId === item.id && this.titleOverflowPreview()?.overflowing
    );
  }

  setTitleOverflow(issueId: string, titleEl: HTMLElement) {
    const overflowing = titleEl.scrollWidth > titleEl.clientWidth;
    this.titleOverflowPreview.set({ issueId, overflowing });
  }

  refreshTitleOverflow() {
    this.titleOverflowPreview.set(null);
  }

  private calcPosition(e: MouseEvent) {
    const gap = 16;
    const width = 320;
    const height = 200;

    let left = e.clientX + gap;
    let top = e.clientY + gap;

    if (left + width > window.innerWidth) {
      left = e.clientX - width - gap;
    }

    if (top + height > window.innerHeight) {
      top = window.innerHeight - height - 12;
    }

    return { left, top };
  }
}
