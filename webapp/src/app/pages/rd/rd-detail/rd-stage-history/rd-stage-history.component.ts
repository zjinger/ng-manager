import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RD_STATUS_COLORS, RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  RdItemStatus,
  RdStageHistoryEntry,
  RdStageHistorySnapshot,
} from '@pages/rd/models/rd.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-rd-stage-history',
  imports: [DetailItemCardComponent, NzTagModule, NzAlertModule, CommonModule],
  template: `
    <app-detail-item-card
      title="研发阶段历史"
      emptyText="暂无研发阶段历史"
      [emptyStatus]="parsedEntries().length === 0"
    >
      <div class="history-list">
        @for (entry of parsedEntries(); track entry.id) {
          <div class="history-item">
            <!-- header -->
            <div class="history-header">
              <div>
                <div class="title">{{ entry.fromStageName }}</div>
                <div class="time">{{ entry.createdAt | date: 'MM:dd HH:mm' }}</div>
              </div>

              <div class="tags">
                <nz-tag [nzColor]="statusColor(entry.snapshot.status)">
                  {{ statusLabel(entry.snapshot.status) }}
                </nz-tag>

                <nz-tag nzColor="blue"> 进度 {{ clampProgress(entry.snapshot.progress) }}% </nz-tag>
              </div>
            </div>

            <!-- 信息块 -->
            <div class="meta-grid">
              <div class="meta-item">
                <div class="label">操作人</div>
                <div class="value">
                  {{ entry.operatorName || entry.operatorId || '系统' }}
                </div>
              </div>

              <div class="meta-item">
                <div class="label">验证人</div>
                <div class="value">
                  {{ entry.snapshot.verifierName || '未指定' }}
                </div>
              </div>

              <div class="meta-item full">
                <div class="label">执行人</div>
                <div class="value">
                  {{
                    entry.snapshot.memberNames.length
                      ? entry.snapshot.memberNames.join('、')
                      : '未指定'
                  }}
                </div>
              </div>

              <div class="meta-item">
                <div class="label">计划周期</div>
                <div class="value">
                  {{ formatDateRange(entry.snapshot.planStartAt, entry.snapshot.planEndAt) }}
                </div>
              </div>

              <div class="meta-item">
                <div class="label">实际周期</div>
                <div class="value">
                  {{ formatDateRange(entry.snapshot.actualStartAt, entry.snapshot.actualEndAt) }}
                </div>
              </div>
            </div>

            <!-- 阻塞 -->
            @if (entry.snapshot.blockerReason) {
              <nz-alert
                class="mt"
                nzType="warning"
                nzShowIcon
                [nzMessage]="'阻塞原因：' + entry.snapshot.blockerReason"
              ></nz-alert>
            }
          </div>
        }
      </div>
    </app-detail-item-card>
  `,
  styles: `
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-item {
      position: relative;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      padding: 12px;
      background: #fff;
    }

    /* 左侧蓝条（关键还原点） */
    .history-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 3px;
      background: #1890ff;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
    }

    .time {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 2px;
    }

    .tags {
      display: flex;
      gap: 8px;
    }

    /* 灰色信息块（核心视觉） */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .meta-item {
      background: #fafafa;
      border-radius: 8px;
      padding: 8px 10px;
    }

    .meta-item.full {
      grid-column: 1 / -1;
    }

    .label {
      font-size: 11px;
      color: #8c8c8c;
    }

    .value {
      font-size: 13px;
      color: #262626;
      font-weight: 500;
      margin-top: 2px;
    }

    .mt {
      margin-top: 10px;
    }

    @media (max-width: 768px) {
      .meta-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class RdStageHistoryComponent {
  // readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly entries = input<RdStageHistoryEntry[]>([]);

  readonly parsedEntries = computed(() =>
    this.entries().map((entry) => ({
      ...entry,
      snapshot: this.parseSnapshot(entry.snapshotJson),
    })),
  );

  statusLabel(status: RdItemStatus): string {
    return RD_STATUS_LABELS[status] ?? status;
  }

  statusColor(status: RdItemStatus): string {
    return RD_STATUS_COLORS[status] ?? status;
  }

  clampProgress(value: number): number {
    const numeric = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  formatDateRange(start: string | null, end: string | null): string {
    return `${this.formatDate(start)} ~ ${this.formatDate(end)}`;
  }

  private formatDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  }

  private parseSnapshot(value: string): RdStageHistorySnapshot {
    try {
      const parsed = JSON.parse(value) as Partial<RdStageHistorySnapshot>;
      return {
        stageId: parsed.stageId ?? null,
        stageName: parsed.stageName ?? '-',
        status: parsed.status ?? 'todo',
        progress: parsed.progress ?? 0,
        assigneeId: parsed.assigneeId ?? null,
        assigneeName: parsed.assigneeName ?? null,
        verifierId: parsed.verifierId ?? null,
        verifierName: parsed.verifierName ?? null,
        memberIds: parsed.memberIds ?? [],
        memberNames: parsed.memberNames ?? [],
        planStartAt: parsed.planStartAt ?? null,
        planEndAt: parsed.planEndAt ?? null,
        actualStartAt: parsed.actualStartAt ?? null,
        actualEndAt: parsed.actualEndAt ?? null,
        blockerReason: parsed.blockerReason ?? null,
      };
    } catch {
      return {
        stageId: null,
        stageName: '-',
        status: 'todo',
        progress: 0,
        assigneeId: null,
        assigneeName: null,
        verifierId: null,
        verifierName: null,
        memberIds: [],
        memberNames: [],
        planStartAt: null,
        planEndAt: null,
        actualStartAt: null,
        actualEndAt: null,
        blockerReason: null,
      };
    }
  }
}
