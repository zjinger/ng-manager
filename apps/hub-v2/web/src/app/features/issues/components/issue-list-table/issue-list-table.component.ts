import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent, TypeBadgeComponent } from '@shared/ui';
import type { IssueEntity } from '../../models/issue.model';
import type { IssueListViewMode } from '../issue-filter-bar/issue-filter-bar.component';

@Component({
  selector: 'app-issue-list-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCheckboxModule,
    DataTableComponent,
    PriorityBadgeComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    DatePipe,
  ],
  templateUrl: './issue-list-table.component.html',
  styleUrls: ['./issue-list-table.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListTableComponent {
  readonly items = input.required<IssueEntity[]>();
  readonly viewMode = input<IssueListViewMode>('list');
  readonly activeIssueId = input<string | null>(null);
  readonly selectedIds = input<string[]>([]);
  readonly page = input(1);
  readonly pageSize = input(20);
  readonly open = output<string>();
  readonly selectionChange = output<string[]>();
  private readonly selectedIdSet = computed(() => new Set(this.selectedIds()));
  private readonly previewImageErrorIds = signal<ReadonlySet<string>>(new Set());
  readonly hoveredPreview = signal<{ src: string; alt: string; left: number; top: number } | null>(null);
  private readonly descriptionPreviewMap = computed(() => {
    const map = new Map<string, { summary: string; imageUrl: string | null; imageAlt: string }>();
    for (const item of this.items()) {
      map.set(item.id, this.parseDescriptionPreview(item.description));
    }
    return map;
  });

  avatarText(name: string): string {
    return name.slice(0, 1);
  }

  sequence(index: number): number {
    const page = this.page() || 1;
    const pageSize = this.pageSize() || 20;
    return (page - 1) * pageSize + index + 1;
  }

  participantNamesText(item: IssueEntity): string {
    const names = (item.participantNames ?? []).filter(Boolean);
    if (names.length === 0) {
      return '';
    }
    if (names.length <= 2) {
      return names.join('、');
    }
    return `${names.slice(0, 2).join('、')} +${names.length - 2}`;
  }

  previewSummary(item: IssueEntity): string {
    return this.descriptionPreviewMap().get(item.id)?.summary ?? '';
  }

  previewImageUrl(item: IssueEntity): string | null {
    if (this.previewImageErrorIds().has(item.id)) {
      return null;
    }
    return this.descriptionPreviewMap().get(item.id)?.imageUrl ?? null;
  }

  previewImageAlt(item: IssueEntity): string {
    return this.descriptionPreviewMap().get(item.id)?.imageAlt || item.title;
  }

  markPreviewImageError(issueId: string): void {
    if (this.previewImageErrorIds().has(issueId)) {
      return;
    }
    const next = new Set(this.previewImageErrorIds());
    next.add(issueId);
    this.previewImageErrorIds.set(next);
    this.hoveredPreview.set(null);
  }

  isSelected(issueId: string): boolean {
    return this.selectedIdSet().has(issueId);
  }

  isAllSelected(): boolean {
    const items = this.items();
    return items.length > 0 && items.every((item) => this.selectedIdSet().has(item.id));
  }

  isPartiallySelected(): boolean {
    const items = this.items();
    if (items.length === 0) {
      return false;
    }
    const selectedCount = items.filter((item) => this.selectedIdSet().has(item.id)).length;
    return selectedCount > 0 && selectedCount < items.length;
  }

  toggleSelect(issueId: string, checked: boolean): void {
    const next = new Set(this.selectedIdSet());
    if (checked) {
      next.add(issueId);
    } else {
      next.delete(issueId);
    }
    this.selectionChange.emit(Array.from(next));
  }

  toggleSelectAll(checked: boolean): void {
    const next = new Set(this.selectedIdSet());
    if (checked) {
      for (const item of this.items()) {
        next.add(item.id);
      }
    } else {
      for (const item of this.items()) {
        next.delete(item.id);
      }
    }
    this.selectionChange.emit(Array.from(next));
  }

  stopRowOpen(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  showHoverPreview(event: MouseEvent, item: IssueEntity): void {
    const src = this.previewImageUrl(item);
    if (!src) {
      this.hoveredPreview.set(null);
      return;
    }
    this.hoveredPreview.set({
      src,
      alt: this.previewImageAlt(item),
      ...this.resolveHoverPreviewPosition(event),
    });
  }

  moveHoverPreview(event: MouseEvent, item: IssueEntity): void {
    if (!this.hoveredPreview()) {
      this.showHoverPreview(event, item);
      return;
    }
    const src = this.previewImageUrl(item);
    if (!src) {
      this.hoveredPreview.set(null);
      return;
    }
    this.hoveredPreview.set({
      src,
      alt: this.previewImageAlt(item),
      ...this.resolveHoverPreviewPosition(event),
    });
  }

  hideHoverPreview(): void {
    this.hoveredPreview.set(null);
  }

  private parseDescriptionPreview(description: string | null): { summary: string; imageUrl: string | null; imageAlt: string } {
    const source = (description ?? '').trim();
    if (!source) {
      return { summary: '', imageUrl: null, imageAlt: '' };
    }

    let firstImageUrl: string | null = null;
    let firstImageAlt = '';

    const markdownImageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(source);
    if (markdownImageMatch) {
      firstImageAlt = markdownImageMatch[1]?.trim() ?? '';
      firstImageUrl = this.normalizeMarkdownImageUrl(markdownImageMatch[2] ?? '');
    }

    if (!firstImageUrl) {
      const htmlImageMatch = /<img\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/i.exec(source);
      if (htmlImageMatch) {
        firstImageUrl = htmlImageMatch[1]?.trim() ?? null;
        const altMatch = /<img\b[^>]*\balt\s*=\s*['"]([^'"]*)['"][^>]*>/i.exec(htmlImageMatch[0] ?? '');
        firstImageAlt = altMatch?.[1]?.trim() ?? '';
      }
    }

    const summary = source
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, ' ')
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

  private normalizeMarkdownImageUrl(raw: string): string | null {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    if (value.startsWith('<') && value.endsWith('>')) {
      const inner = value.slice(1, -1).trim();
      return inner || null;
    }
    const targetMatch = /^(\S+)(?:\s+['"][\s\S]*['"])?$/.exec(value);
    return targetMatch?.[1] ?? value;
  }

  private resolveHoverPreviewPosition(event: MouseEvent): { left: number; top: number } {
    const previewWidth = 360;
    const previewHeight = 240;
    const gap = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = event.clientX + gap;
    let top = event.clientY + gap;

    if (left + previewWidth > viewportWidth - 12) {
      left = event.clientX - previewWidth - gap;
    }
    if (left < 12) {
      left = 12;
    }

    if (top + previewHeight > viewportHeight - 12) {
      top = viewportHeight - previewHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }

    return { left, top };
  }
}
