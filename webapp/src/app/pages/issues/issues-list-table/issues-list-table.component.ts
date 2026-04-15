import { Component, effect, input, output } from '@angular/core';
import { IssueEntity, IssuePriority, IssueStatus, IssueType } from '../models/issue.model';
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
@Component({
  selector: 'app-issues-list-table',
  imports: [
    NzTableModule,
    NzTagModule,
    NzProgressModule,
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
  readonly loading = input(false);
  readonly selectItem = output<IssueEntity>();
  constructor() {
    effect(() => {
      console.log('IssuesListTableComponent issues updated:', this.issues(), this.loading());
    });
  }

  // hover 预览状态
  readonly hoveredPreview = signal<{
    src: string;
    alt: string;
    left: number;
    top: number;
  } | null>(null);

  // 图片解析缓存
  readonly imageErrorSet = signal(new Set<string>());
  private readonly previewMap = computed(() => {
    const map = new Map<string, { summary: string; imageUrl: string | null; imageAlt: string }>();

    for (const item of this.issues()) {
      map.set(item.id, this.parseDescriptionImage(item.description, this.projectId()!, item.id));
    }

    return map;
  });

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
    // if (names.length <= 2) {
    //   return names.join('、');
    // }
    // return `${names.slice(0, 2).join('、')} +${names.length - 2}`;
    return names.join('、');
  }

  private parseDescriptionImage(description: string | null, projectId: string, issueId: string) {
    const source = (description ?? '').trim();
    if (!source) {
      return { summary: '', imageUrl: null, imageAlt: '' };
    }

    let firstImageUrl: string | null = null;
    let firstImageAlt = '';

    const markdownImageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(source);
    if (markdownImageMatch) {
      firstImageAlt = markdownImageMatch[1]?.trim() ?? '';
      firstImageUrl = this.normalizeImageUrl(markdownImageMatch[2] ?? '', projectId, issueId);
    }

    if (!firstImageUrl) {
      const htmlImageMatch = /<img\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/i.exec(source);
      if (htmlImageMatch) {
        firstImageUrl = htmlImageMatch[1]?.trim() ?? null;
        const altMatch = /<img\b[^>]*\balt\s*=\s*['"]([^'"]*)['"][^>]*>/i.exec(
          htmlImageMatch[0] ?? '',
        );
        firstImageAlt = altMatch?.[1]?.trim() ?? '';
      }
    }

    const summary = source
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '【图片】')
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/[*_~]/g, '')
      .replace(/\r?\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      summary,
      imageUrl: firstImageUrl || null,
      imageAlt: firstImageAlt,
    };
  }

  private normalizeImageUrl(raw: string, projectId: string, issueId: string): string | null {
    const value = raw.trim();
    if (!value) return null;

    // 匹配 /api/admin/uploads/xxx/raw
    const match = value.match(/\/api\/admin\/uploads\/([a-zA-Z0-9_-]+)\/raw/);

    if (!match) {
      return value; // 非内部资源，直接返回
    }

    const uploadId = match[1];

    return `/api/client/hub-token/projects/${projectId}/issues/${issueId}/uploads/${uploadId}/raw`;
  }

  previewSummary(item: IssueEntity): string {
    return this.previewMap().get(item.id)?.summary || '暂无详细描述';
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
    const img = new Image();
    img.src = data.imageUrl!;

    img.onload = () => {
      this.hoveredPreview.set({
        src: data.imageUrl!,
        alt: data.imageAlt || item.title,
        ...position,
      });
    };

    img.onerror = () => {
      const set = new Set(this.imageErrorSet());
      set.add(data.imageUrl!);
      this.imageErrorSet.set(set);

      this.hoveredPreview.set(null);
    };
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
