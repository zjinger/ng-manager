import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_COLORS, RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { ProjectMemberEntity } from '@models/project.model';
import {
  RdItemEntity,
  RdItemPriority,
  RdItemStatus,
  RdStageEntity,
  RdStageHistoryEntry,
  RdStageHistorySnapshot,
} from '@pages/rd/models/rd.model';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-rd-base-info',
  imports: [NzDescriptionsModule, DetailItemCardComponent, NzTagModule, CommonModule],
  template: `
    <div class="base-info-container">
      <app-detail-item-card title="基础信息">
        @if (rdItem(); as rdItem) {
          <nz-descriptions nzBordered nzSize="small" [nzColumn]="1">
            <nz-descriptions-item nzTitle="创建人">
              {{ rdItem.creatorName }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="执行人">
              {{ memberNames() }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="验收人">
              {{ rdItem.creatorName }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="状态">
              <nz-tag [nzColor]="getStatusColor(rdItem.status)">
                {{ getStatusLabel(rdItem.status) }}
              </nz-tag>
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="优先级">
              <nz-tag [nzColor]="getPriorityColor(rdItem.priority)">
                {{ getPriorityLabel(rdItem.priority) }}
              </nz-tag>
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="阶段">
              {{ getStagesName(rdItem.stageId) }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="进度"> {{ rdItem.progress }} % </nz-descriptions-item>
          </nz-descriptions>
        }
      </app-detail-item-card>

      <app-detail-item-card title="时间信息">
        <!-- 在这里补充代码 -->
        @if (rdItem(); as item) {
          <div class="time-grid">
            <div class="time-item">
              <div class="label">计划开始</div>
              <div class="value">{{ (item.planStartAt | date: 'yyyy-MM-dd') || '未设置' }}</div>
            </div>

            <div class="time-item">
              <div class="label">计划结束</div>
              <div class="value">{{ (item.planEndAt | date: 'yyyy-MM-dd') || '未设置' }}</div>
            </div>

            <div class="time-item">
              <div class="label">实际开始</div>
              <div class="value">{{ (item.actualStartAt | date: 'yyyy-MM-dd') || '-' }}</div>
            </div>

            <div class="time-item">
              <div class="label">实际结束</div>
              <div class="value">{{ (item.actualEndAt | date: 'yyyy-MM-dd') || '-' }}</div>
            </div>

            <div class="time-item">
              <div class="label">计划工期</div>
              <div class="value">{{ getPlannedDuration() }}</div>
            </div>

            <div class="time-item">
              <div class="label">实际工期</div>
              <div class="value">{{ getActualDuration() }}</div>
            </div>

            <div class="time-item">
              <div class="label">当前阶段工期</div>
              <div class="value">{{ getCurrentStageDuration() }}</div>
            </div>

            <div class="time-item full">
              <div class="label">创建时间</div>
              <div class="value">{{ item.createdAt | date: 'yyyy-MM-dd HH:mm' }}</div>
            </div>
          </div>

          <div class="time-status">时间状态：{{ getTimeStatus() }}。{{ getTimeStatusHint() }}</div>
        }
      </app-detail-item-card>
    </div>
  `,
  styles: `
    .base-info-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .time-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .time-item {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 12px;

      .label {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 4px;
      }

      .value {
        font-size: 14px;
        font-weight: 500;
        color: #262626;
      }

      &.full {
        grid-column: span 2;
      }
    }

    .time-status {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      background: #fff7e6;
      color: #d46b08;
      border: 1px solid #ffd591;
      font-size: 13px;
    }
  `,
})
export class RdBaseInfoComponent {
  readonly rdItem = input.required<RdItemEntity>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);

  memberNames = computed(() => {
    if (this.rdItem().memberIds.length <= 0 || this.members().length <= 0) {
      return this.rdItem().assigneeName;
    } else {
      return this.rdItem()
        .memberIds.map((id) => {
          const member = this.members().find((member) => member.userId === id);          
          return member?.displayName;
        })
        .join('，');
    }
  });

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }

  getStatusColor(status: RdItemStatus) {
    return RD_STATUS_COLORS[status];
  }

  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getPriorityColor(priority: RdItemPriority) {
    return PRIORITY_COLORS[priority];
  }

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }

  getPlannedDuration(): string {
    const startAt = this.rdItem().planStartAt;
    const endAt = this.rdItem().planEndAt;
    if (!startAt || !endAt) {
      return '-';
    }
    return this.formatDuration(this.diffDurationDays(startAt, endAt));
  }

  // 计算实际工期,包含历史阶段
  getActualDuration(): string {
    const current = this.rdItem();
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
    const days = this.getCurrentStageDurationDays(this.rdItem());
    if (days <= 0) {
      return '-';
    }
    return this.formatDuration(days);
  }

  getTimeStatus(): string {
    const item = this.rdItem();
    if (!item.actualStartAt) return '未开始';
    if (item.status !== 'done' && item.status !== 'accepted' && item.status !== 'closed')
      return '进行中';
    if (!item.actualEndAt || !item.planEndAt) return '已完成';

    const actualEnd = new Date(item.actualEndAt);
    const planEnd = new Date(item.planEndAt);
    const diffDays =
      Math.round(((planEnd.getTime() - actualEnd.getTime()) / (1000 * 60 * 60 * 24)) * 2) / 2;

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
      (item.status === 'done' || item.status === 'accepted' || item.status === 'closed'
        ? item.updatedAt
        : new Date().toISOString());
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
