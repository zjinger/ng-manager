import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { RD_STATUS_LABELS } from '@shared/constants';
import { DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { getRdMemberIds, type RdItemEntity, type RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-list-table',
  standalone: true,
  imports: [DatePipe, NzProgressModule, NzTooltipModule, DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent],
  templateUrl: './rd-list-table.component.html',
  styleUrls: ['./rd-list-table.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdListTableComponent {
  readonly items = input<RdItemEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly selectedItemId = input<string | null>(null);
  readonly page = input(1);
  readonly pageSize = input(20);
  readonly selectItem = output<RdItemEntity>();
  private readonly previewImageErrorIds = signal<ReadonlySet<string>>(new Set());
  readonly hoveredPreview = signal<{ src: string; alt: string; left: number; top: number } | null>(null);
  private readonly previewMap = computed(() => {
    const map = new Map<string, { summary: string; imageUrl: string | null; imageAlt: string }>();
    for (const item of this.items()) {
      map.set(item.id, this.parseDescriptionPreview(item.description));
    }
    return map;
  });

  stageName(stageId: string | null): string {
    return this.stages().find((item) => item.id === stageId)?.name ?? '未归类';
  }

  stageSegments(item: RdItemEntity): Array<{ name: string; isCurrent: boolean }> {
    const trail = Array.isArray(item.stageTrail) ? item.stageTrail.map((name) => name?.trim()).filter(Boolean) : [];
    const current = this.stageName(item.stageId);
    const path: string[] = [...trail];
    if (!path.length || path[path.length - 1]?.trim() !== current.trim()) {
      path.push(current);
    }
    return path.map((name, index) => ({ name, isCurrent: index === path.length - 1 }));
  }

  stagePathTooltip(item: RdItemEntity): string {
    const segments = this.stageSegments(item);
    if (segments.length === 0) {
      return '-';
    }
    return segments.map((segment) => segment.name).join(' / ');
  }

  sequence(index: number): number {
    const page = this.page() || 1;
    const pageSize = this.pageSize() || 20;
    return (page - 1) * pageSize + index + 1;
  }

  previewSummary(item: RdItemEntity): string {
    return this.previewMap().get(item.id)?.summary ?? '';
  }

  previewImageUrl(item: RdItemEntity): string | null {
    if (this.previewImageErrorIds().has(item.id)) {
      return null;
    }
    return this.previewMap().get(item.id)?.imageUrl ?? null;
  }

  previewImageAlt(item: RdItemEntity): string {
    return this.previewMap().get(item.id)?.imageAlt || item.title;
  }

  markPreviewImageError(itemId: string): void {
    if (this.previewImageErrorIds().has(itemId)) {
      return;
    }
    const next = new Set(this.previewImageErrorIds());
    next.add(itemId);
    this.previewImageErrorIds.set(next);
    this.hoveredPreview.set(null);
  }

  showHoverPreview(event: MouseEvent, item: RdItemEntity): void {
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

  moveHoverPreview(event: MouseEvent, item: RdItemEntity): void {
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

  statusLabel(status: string): string {
    return RD_STATUS_LABELS[status] ?? status;
  }

  memberIds(item: RdItemEntity): string[] {
    return getRdMemberIds(item);
  }

  memberNamesText(item: RdItemEntity): string {
    const ids = this.memberIds(item);
    if (ids.length === 0) {
      return '';
    }
    const memberMap = new Map(this.members().map((member) => [member.userId, member.displayName]));
    return ids.map((id) => memberMap.get(id) || id).join('、');
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

    return { summary, imageUrl: firstImageUrl || null, imageAlt: firstImageAlt };
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
