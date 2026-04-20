import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PanelCardComponent } from '@shared/ui';
import type { RdItemStatus, RdStageHistoryEntry, RdStageHistorySnapshot } from '../../models/rd.model';

@Component({
  selector: 'app-rd-stage-history-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    <app-panel-card title="研发阶段历史">
      <div class="history-list">
        @for (entry of parsedEntries(); track entry.id) {
          <div class="history-item">
            <div class="history-item__head">
              <div class="history-item__title">
                <strong>{{ entry.fromStageName }} <!-- {{ entry.toStageName }}--></strong>
                <span>{{ formatTime(entry.createdAt) }}</span>
              </div>
              <div class="history-item__badges">
                <span class="status-pill" [class]="'status-pill status-pill--' + entry.snapshot.status">
                  {{ statusLabel(entry.snapshot.status) }}
                </span>
                <span class="progress-pill">进度 {{ clampProgress(entry.snapshot.progress) }}%</span>
              </div>
            </div>

            <div class="history-item__meta-grid">
              <div class="meta-cell">
                <span class="meta-cell__label">操作人</span>
                <span class="meta-cell__value">{{ entry.operatorName || entry.operatorId || '系统' }}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-cell__label">验证人</span>
                <span class="meta-cell__value">{{ entry.snapshot.verifierName || '未指定' }}</span>
              </div>
              <div class="meta-cell meta-cell--full">
                <span class="meta-cell__label">执行人</span>
                <span class="meta-cell__value">{{ entry.snapshot.memberNames.length > 0 ? entry.snapshot.memberNames.join('、') : '未指定' }}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-cell__label">计划周期</span>
                <span class="meta-cell__value">{{ formatDateRange(entry.snapshot.planStartAt, entry.snapshot.planEndAt) }}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-cell__label">实际周期</span>
                <span class="meta-cell__value">{{ formatDateRange(entry.snapshot.actualStartAt, entry.snapshot.actualEndAt) }}</span>
              </div>
            </div>

            @if (entry.snapshot.blockerReason) {
              <div class="history-item__blocker">阻塞原因：{{ entry.snapshot.blockerReason }}</div>
            }
          </div>
        } @empty {
          <div class="history-empty">暂无阶段历史</div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .history-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px 16px 16px;
      }
      .history-item {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--surface-overlay);
        padding: 12px;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
        position: relative;
      }
      .history-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        border-radius: 12px 0 0 12px;
        background: linear-gradient(180deg, var(--primary-500, #4f46e5), rgba(99, 102, 241, 0.28));
      }
      .history-item__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .history-item__title {
        display: grid;
        gap: 4px;
      }
      .history-item__title strong {
        font-size: 13px;
        color: var(--text-heading);
      }
      .history-item__title span {
        font-size: 12px;
        color: var(--text-muted);
      }
      .history-item__badges {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .status-pill {
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid transparent;
      }
      .status-pill--todo {
        color: #1d4ed8;
        background: rgba(59, 130, 246, 0.12);
        border-color: rgba(59, 130, 246, 0.24);
      }
      .status-pill--doing {
        color: #4f46e5;
        background: rgba(99, 102, 241, 0.12);
        border-color: rgba(99, 102, 241, 0.24);
      }
      .status-pill--blocked {
        color: #b45309;
        background: rgba(245, 158, 11, 0.14);
        border-color: rgba(245, 158, 11, 0.28);
      }
      .status-pill--done,
      .status-pill--accepted {
        color: #047857;
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.24);
      }
      .status-pill--closed {
        color: #475569;
        background: rgba(100, 116, 139, 0.14);
        border-color: rgba(100, 116, 139, 0.26);
      }
      .progress-pill {
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--primary-700, #4338ca);
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.2);
      }
      .history-item__meta-grid {
        margin-top: 10px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .meta-cell {
        display: grid;
        gap: 3px;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-color-soft);
      }
      .meta-cell--full {
        grid-column: 1 / -1;
      }
      .meta-cell__label {
        font-size: 11px;
        color: var(--text-muted);
      }
      .meta-cell__value {
        font-size: 12px;
        color: var(--text-primary);
        font-weight: 600;
        word-break: break-word;
      }
      .history-item__blocker {
        margin-top: 8px;
        border-radius: 10px;
        border: 1px solid rgba(245, 158, 11, 0.32);
        background: rgba(251, 191, 36, 0.1);
        color: #92400e;
        font-size: 12px;
        padding: 8px 10px;
      }
      .history-empty {
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        padding: 20px 0;
      }
      @media (max-width: 768px) {
        .history-item__head {
          flex-direction: column;
          align-items: stretch;
        }
        .history-item__badges {
          justify-content: flex-start;
        }
        .history-item__meta-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdStageHistoryPanelComponent {
  readonly entries = input<RdStageHistoryEntry[]>([]);

  readonly parsedEntries = computed(() =>
    this.entries().map((entry) => ({
      ...entry,
      snapshot: this.parseSnapshot(entry.snapshotJson),
    }))
  );

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }

  statusLabel(status: RdItemStatus): string {
    return (
      {
        todo: '待开始',
        doing: '进行中',
        blocked: '已阻塞',
        done: '待确认',
        accepted: '已完成',
        closed: '已关闭',
      }[status] || status
    );
  }

  clampProgress(value: number): number {
    const numeric = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  formatDateRange(start: string | null, end: string | null): string {
    const startText = this.formatDate(start);
    const endText = this.formatDate(end);
    return `${startText} ~ ${endText}`;
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }
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
