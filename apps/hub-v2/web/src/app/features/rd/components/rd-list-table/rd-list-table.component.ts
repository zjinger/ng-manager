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
  template: `
    <app-data-table>
      <div table-head class="rd-table__head">
        <div>序号</div>
        <div>编号</div>
        <div>研发项</div>
        <div>阶段</div>
        <div>创建人</div>
        <div>执行人</div>
        <div>进度</div>
        <div>更新时间</div>
      </div>
      <div table-body class="rd-table__body">
        @for (item of items(); track item.id; let i = $index) {
          <div class="rd-row" [class.is-active]="selectedItemId() === item.id" (click)="selectItem.emit(item)">
            <div class="rd-cell rd-cell--seq">{{ sequence(i) }}</div>
            <div class="rd-cell rd-cell--id">{{ item.rdNo }}</div>
            <div class="rd-cell">
              <div class="rd-title-wrap">
                <div class="rd-title-main">
                  <div class="rd-title-main-header">
                    <div class="rd-name">{{ item.title }}</div>
                    <div class="rd-title-badges">
                      <app-status-badge [status]="item.status" [label]="statusLabel(item.status)" />
                      <app-priority-badge [priority]="item.priority" />
                    </div>
                  </div>
                  <div class="rd-meta">{{ previewSummary(item) || '暂无详细描述' }}</div>
                </div>
                @if (previewImageUrl(item); as imageUrl) {
                  <div
                    class="rd-thumb-wrap"
                    (mouseenter)="showHoverPreview($event, item)"
                    (mousemove)="moveHoverPreview($event, item)"
                    (mouseleave)="hideHoverPreview()"
                  >
                    <img
                      class="rd-thumb"
                      [src]="imageUrl"
                      [alt]="previewImageAlt(item)"
                      (error)="markPreviewImageError(item.id)"
                    />
                  </div>
                }
              </div>
            </div>
            <div class="rd-cell">
              <span class="rd-stage-text" [nz-tooltip]="stagePathTooltip(item)">
                @for (segment of stageSegments(item); track $index; let last = $last) {
                  <span class="rd-stage-node" [class.is-current]="segment.isCurrent">
                    {{ segment.name }}
                  </span>
                  @if (!last) {
                    <span class="rd-stage-sep"> / </span>
                  }
                }
              </span>
            </div>
            <div class="rd-cell">
              <span class="rd-member-text" [nz-tooltip]="item.creatorName || '-'">{{ item.creatorName || '-' }}</span>
            </div>
            <div class="rd-cell">
              @if (memberNamesText(item); as memberNames) {
                <span class="rd-member-text" [nz-tooltip]="memberNames">{{ memberNames }}</span>
              } @else {
                <span class="no-member">未指派</span>
              }
            </div>
            <div class="rd-cell rd-cell--progress">
              <nz-progress
                [nzPercent]="item.progress"
                [nzShowInfo]="true"
                [nzStrokeWidth]="6"
                [nzSize]="'small'"
              ></nz-progress>
            </div>
            <div class="rd-cell rd-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
          </div>
        }
      </div>
    </app-data-table>
    @if (hoveredPreview(); as preview) {
      <div class="rd-image-hover-preview" [style.left.px]="preview.left" [style.top.px]="preview.top">
        <img class="rd-image-hover-preview__image" [src]="preview.src" [alt]="preview.alt" />
      </div>
    }
  `,
  styles: [
    `
      .rd-table__head,
      .rd-row {
        display: grid;
        grid-template-columns: 56px 120px minmax(0, 2.4fr) minmax(0, 1fr) 120px minmax(0, 1fr) 140px 110px;
        gap: 16px;
        align-items: center;
      }
      .rd-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .rd-row {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color-soft);
        cursor: pointer;
        transition: var(--transition-base);
      }
      .rd-row:last-child {
        border-bottom: 0;
      }
      .rd-row:hover {
        background: var(--bg-subtle);
      }
      .rd-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }
      .rd-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .rd-cell--progress {
        min-width: 140px;
      }
      .rd-cell--seq {
        color: var(--text-muted);
        font-size: 12px;
      }
      .rd-cell--id {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--primary-700);
      }
      .rd-member-text {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rd-cell--progress :where(.ant-progress-text) {
        color: var(--text-muted);
      }
      .rd-stage-text {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rd-stage-node {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text-secondary);
      }
      .rd-stage-node.is-current {
        color: var(--primary-700);
        font-weight: 700;
      }
      .rd-stage-sep {
        color: var(--text-muted);
      }
      .rd-name {
        font-weight: 700;
        color: var(--text-heading);
        font-size: 14px;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rd-title-main-header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .rd-title-badges {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .rd-meta,
      .rd-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }
      .rd-meta {
        margin-top: 4px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal;
        line-height: 1.5;
      }
      .rd-title-wrap {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }
      .rd-title-main {
        min-width: 0;
        flex: 1 1 auto;
      }
      .rd-thumb-wrap {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color-soft);
        background: var(--bg-subtle);
        flex: 0 0 auto;
        cursor: zoom-in;
      }
      .rd-thumb {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .rd-image-hover-preview {
        position: fixed;
        z-index: 1200;
        width: 360px;
        height: 240px;
        padding: 8px;
        border-radius: 14px;
        border: 1px solid color-mix(in srgb, var(--primary-300) 30%, var(--border-color));
        background: color-mix(in srgb, var(--bg-container) 92%, white 8%);
        box-shadow: 0 22px 48px rgba(15, 23, 42, 0.24);
        pointer-events: none;
        backdrop-filter: blur(10px);
      }
      .rd-image-hover-preview__image {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        border-radius: 10px;
        background: var(--bg-subtle);
      }
      .no-member {
        color: var(--text-muted);
        font-size: 13px;
      }
      @media (max-width: 1100px) {
        .rd-table__head {
          display: none;
        }
        .rd-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
      :host-context(html[data-theme='dark']) .rd-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
      :host-context(html[data-theme='dark']) .rd-image-hover-preview {
        background: color-mix(in srgb, var(--bg-container) 88%, black 12%);
        border-color: rgba(129, 140, 248, 0.28);
        box-shadow: 0 28px 56px rgba(2, 6, 23, 0.46);
      }
    `,
  ],
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
