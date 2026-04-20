import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
        <div>状态</div>
        <div>优先级</div>
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
                  <div class="rd-name">{{ item.title }}</div>
                  <div class="rd-meta">{{ previewSummary(item) || '暂无详细描述' }}</div>
                </div>
                @if (previewImageUrl(item); as imageUrl) {
                  <div class="rd-thumb-wrap">
                    <img class="rd-thumb" [src]="imageUrl" [alt]="previewImageAlt(item)" />
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
            <div class="rd-cell"><app-status-badge [status]="item.status" [label]="statusLabel(item.status)" /></div>
            <div class="rd-cell"><app-priority-badge [priority]="item.priority" /></div>
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
  `,
  styles: [
    `
      .rd-table__head,
      .rd-row {
        display: grid;
        grid-template-columns: 56px 120px minmax(0, 2fr) minmax(0, 1.2fr) 110px 90px minmax(0, 1fr) 140px 110px;
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
      }
      .rd-thumb {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
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
    return this.previewMap().get(item.id)?.imageUrl ?? null;
  }

  previewImageAlt(item: RdItemEntity): string {
    return this.previewMap().get(item.id)?.imageAlt || item.title;
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
}
