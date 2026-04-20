import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RD_STATUS_LABELS } from '@shared/constants';
import { PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent } from '@shared/ui';
import type { RdItemEntity, RdStageEntity, RdStageHistoryEntry, RdStageHistorySnapshot } from '../../models/rd.model';

@Component({
  selector: 'app-rd-props-panel',
  standalone: true,
  imports: [PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="props-stack">
      <app-panel-card title="基础信息">
        <dl class="props">
          <div>
            <dt>状态</dt>
            <dd><app-status-badge [status]="item().status" [label]="statusLabel(item().status)" /></dd>
          </div>
          <div>
            <dt>优先级</dt>
            <dd><app-priority-badge [priority]="item().priority" /></dd>
          </div>
          <div>
            <dt>阶段</dt>
            <dd>{{ stageName(item().stageId) }}</dd>
          </div>
          <div>
            <dt>创建人</dt>
            <dd>{{ item().creatorName || '-' }}</dd>
          </div>
          <div>
            <dt>执行人</dt>
            <dd class="member-names">{{ memberNamesText() }}</dd>
          </div>
          <div>
            <dt>验证人</dt>
            <dd>{{ verifierDisplayName() }}</dd>
          </div>
          <div>
            <dt>进度</dt>
            <dd>{{ item().progress }}%</dd>
          </div>
        </dl>
      </app-panel-card>

      <app-panel-card title="时间信息">
        <div class="time-grid">
          <div class="time-item">
            <span>计划开始</span>
            <strong>{{ formatDate(item().planStartAt) }}</strong>
          </div>
          <div class="time-item">
            <span>计划结束</span>
            <strong>{{ formatDate(item().planEndAt) }}</strong>
          </div>
          <div class="time-item">
            <span>实际开始</span>
            <strong>{{ formatDate(item().actualStartAt, '-') }}</strong>
          </div>
          <div class="time-item">
            <span>实际结束</span>
            <strong>{{ formatDate(item().actualEndAt, '-') }}</strong>
          </div>
          <div class="time-item">
            <span>计划工期</span>
            <strong>{{ getPlannedDuration() }}</strong>
          </div>
          <div class="time-item">
            <span>实际工期</span>
            <strong>{{ getActualDuration() }}</strong>
          </div>
          <div class="time-item">
            <span>当前阶段工期</span>
            <strong>{{ getCurrentStageDuration() }}</strong>
          </div>
          <div class="time-item time-item--full">
            <span>创建时间</span>
            <strong>{{ formatDate(item().createdAt, '-') }}</strong>
          </div>
        </div>
        <div class="time-status-note">
          时间状态：{{ getTimeStatus() }}。{{ getTimeStatusHint() }}
        </div>
      </app-panel-card>
    </div>
  `,
  styles: [
    `
      .props-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .props {
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
      }
      .props div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      dt {
        color: var(--text-muted);
      }
      dd {
        margin: 0;
        color: var(--text-primary);
        font-weight: 600;
        text-align: right;
      }
      .member-names {
        max-width: 170px;
        line-height: 1.5;
        white-space: normal;
      }
      .time-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 14px 16px 12px;
      }
      .time-item {
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        background: var(--bg-subtle);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 80px;
      }
      .time-item span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .time-item strong {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
        text-align: left;
      }
      .time-item--full {
        grid-column: 1 / -1;
      }
      .time-status-note {
        margin: 0 16px 16px;
        border: 1px solid rgba(245, 158, 11, 0.32);
        background: rgba(245, 158, 11, 0.08);
        color: rgb(180, 83, 9);
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.6;
      }
      @media (max-width: 900px) {
        .time-grid {
          grid-template-columns: 1fr;
        }
      }
      :host-context(html[data-theme='dark']) .time-status-note {
        border-color: rgba(251, 191, 36, 0.35);
        background: rgba(251, 191, 36, 0.12);
        color: rgb(253, 230, 138);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdPropsPanelComponent {
  readonly item = input.required<RdItemEntity>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly memberNames = input<string[]>([]);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);

  memberNamesText(): string {
    const names = this.memberNames()
      .map((name) => name.trim())
      .filter(Boolean);
    return names.length > 0 ? names.join('、') : '-';
  }

  stageName(stageId: string | null): string {
    return this.stages().find((stage) => stage.id === stageId)?.name ?? '未归类';
  }

  statusLabel(status: string): string {
    return RD_STATUS_LABELS[status] ?? status;
  }

  verifierDisplayName(): string {
    const verifierName = this.item().verifierName?.trim();
    if (verifierName) {
      return verifierName;
    }
    const creatorName = this.item().creatorName?.trim();
    return creatorName || '-';
  }

  formatDate(value: string | null | undefined, fallback = '未设置'): string {
    if (!value) {
      return fallback;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPlannedDuration(): string {
    const startAt = this.item().planStartAt;
    const endAt = this.item().planEndAt;
    if (!startAt || !endAt) {
      return '-';
    }
    return this.formatDuration(this.diffDurationDays(startAt, endAt));
  }

  getActualDuration(): string {
    const current = this.item();
    const historyDays = this.stageHistory()
      .map((entry) => this.parseSnapshot(entry.snapshotJson))
      .reduce((total, snapshot) => {
        if (!snapshot?.actualStartAt || !snapshot.actualEndAt) {
          return total;
        }
        return total + this.diffDurationDays(snapshot.actualStartAt, snapshot.actualEndAt);
      }, 0);

    const currentStageDays = this.getCurrentStageDurationDays(current);
    const totalDays = historyDays + currentStageDays;
    if (totalDays <= 0) {
      return '-';
    }
    return this.formatDuration(totalDays);
  }

  getCurrentStageDuration(): string {
    const days = this.getCurrentStageDurationDays(this.item());
    if (days <= 0) {
      return '-';
    }
    return this.formatDuration(days);
  }

  getTimeStatus(): string {
    const item = this.item();
    if (!item.actualStartAt) return '未开始';
    if (item.status !== 'done' && item.status !== 'accepted' && item.status !== 'closed') return '进行中';
    if (!item.actualEndAt || !item.planEndAt) return '已完成';

    const actualEnd = new Date(item.actualEndAt);
    const planEnd = new Date(item.planEndAt);
    const diffDays = Math.round(((planEnd.getTime() - actualEnd.getTime()) / (1000 * 60 * 60 * 24)) * 2) / 2;

    if (diffDays > 0) return `提前 ${this.formatDuration(diffDays)}`;
    if (diffDays === 0) return '按时完成';
    return `延期 ${this.formatDuration(Math.abs(diffDays))}`;
  }

  getTimeStatusHint(): string {
    const status = this.getTimeStatus();
    if (status === '未开始') {
      return '开始后将自动统计实际工期。';
    }
    if (status === '进行中') {
      return '完成后自动计算“提前 / 按时 / 延期”。';
    }
    return '时间统计已按计划与实际结束时间自动计算。';
  }

  private parseSnapshot(snapshotJson: string): RdStageHistorySnapshot | null {
    if (!snapshotJson) {
      return null;
    }
    try {
      return JSON.parse(snapshotJson) as RdStageHistorySnapshot;
    } catch {
      return null;
    }
  }

  private getCurrentStageDurationDays(item: RdItemEntity): number {
    if (!item.actualStartAt) {
      return 0;
    }
    const endAt =
      item.actualEndAt ??
      (item.status === 'done' || item.status === 'accepted' || item.status === 'closed' ? item.updatedAt : new Date().toISOString());
    return this.diffDurationDays(item.actualStartAt, endAt);
  }

  private formatDuration(days: number): string {
    const rounded = Math.round(Math.max(0, days) * 2) / 2;
    if (rounded <= 0) {
      return '-';
    }
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} 天`;
  }

  private parseDateTime(value: string, boundary: 'start' | 'end'): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const suffix = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
      return new Date(`${value}${suffix}`);
    }
    return new Date(value);
  }

  private diffDurationDays(startAt: string, endAt: string): number {
    const start = this.parseDateTime(startAt, 'start');
    const end = this.parseDateTime(endAt, 'end');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    const ms = Math.max(0, end.getTime() - start.getTime());
    const days = ms / (1000 * 60 * 60 * 24);
    const rounded = Math.round(days * 2) / 2;
    if (ms > 0 && rounded === 0) {
      return 0.5;
    }
    if (ms === 0) {
      return 0.5;
    }
    return rounded;
  }
}
