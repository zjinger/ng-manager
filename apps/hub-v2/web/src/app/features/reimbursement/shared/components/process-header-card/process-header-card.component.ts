import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import type { ReimbursementClaimDetail } from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementTypeTagComponent } from '@app/features/reimbursement/shared/components/reimbursement-type-tag/reimbursement-type-tag.component';

@Component({
  selector: 'app-process-header-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReimbursementTypeTagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .process-card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 20px 24px;
        margin-bottom: 16px;
        margin-top: 16px;
      }

      .process-card__content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .process-card__left {
        flex: 1;
        min-width: 0;
      }

      .process-card__top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }

      .process-card__code {
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        color: #4338ca;
      }

      .process-card__status {
        padding: 2px 8px;
        border-radius: 999px;
        background: #ede9fe;
        color: #6d28d9;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }

      .process-card__desc {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        font-size: 14px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
      }

      .process-card__reason {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .process-card__time {
        flex: 0 0 auto;
        color: #64748b;
      }

      .process-card__right {
        display: flex;
        align-items: center;
        gap: 48px;
        flex-shrink: 0;
      }

      .process-stat {
        text-align: center;
      }

      .process-stat__label {
        margin-bottom: 4px;
        font-size: 14px;
        color: #94a3b8;
      }

      .process-stat__value {
        min-width: 72px;
        font-size: 20px;
        font-weight: 700;
        white-space: nowrap;
      }

      .process-stat__value.money {
        font-size: 20px;
      }

      .process-stat__value.warning {
        color: #f97316;
      }

      @media (max-width: 1200px) {
        .process-card__content {
          flex-direction: column;
          align-items: flex-start;
        }

        .process-card__right {
          width: 100%;
          justify-content: space-between;
        }
      }

      @media (max-width: 768px) {
        .process-card {
          padding: 16px;
        }

        .process-card__right {
          width: 100%;
          gap: 20px;
          overflow-x: auto;
        }

        .process-card__code {
          font-size: 16px;
        }

        .process-card__desc {
          font-size: 13px;
        }

        .process-card__time {
          display: none;
        }

        .process-stat__label {
          font-size: 12px;
        }

        .process-stat__value {
          font-size: 16px;
        }
      }
    `,
  ],
  template: `
    <div class="process-card">
      <div class="process-card__content">
        <!-- 左侧 -->
        <div class="process-card__left">
          <div class="process-card__top">
            <div class="process-card__code">
              {{ data().claimNo || '--' }}
            </div>

            <div class="process-card__status">
              {{ statusLabel() }}
            </div>
          </div>

          <div class="process-card__desc">
            <app-reimbursement-type-tag [type]="data().claimType" />
            @if (reasonText(); as reason) {
              <span class="process-card__reason" [title]="reason">{{ reason }}</span>
            }
            @if (submittedTimeText(); as submittedTime) {
              <span class="process-card__time">· {{ submittedTime }}</span>
            }
          </div>
        </div>

        <!-- 右侧 -->
        <div class="process-card__right">
          <!-- 报销金额 -->
          <div class="process-stat">
            <div class="process-stat__label">报销金额</div>
            <div class="process-stat__value money">
              @if (data().totalAmount !== undefined && data().totalAmount !== null) {
              {{ data().totalAmount | currency : '¥' : 'symbol' : '1.2-2' }}
              } @else { -- }
            </div>
          </div>

          <!-- 当前节点 -->
          <div class="process-stat">
            <div class="process-stat__label">当前节点</div>
            <div class="process-stat__value">
              {{ currentStageName() }}
            </div>
          </div>

          <!-- 等待时长（可选，需要后端提供） -->
          <div class="process-stat">
            <div class="process-stat__label">等待时长</div>
            <div class="process-stat__value warning">
              {{ waitTime() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProcessHeaderCardComponent {
  // 使用 ReimbursementClaimDetail 类型
  readonly data = input<ReimbursementClaimDetail>({} as ReimbursementClaimDetail);

  // 状态标签映射
  private readonly statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    approving: '审批中',
    rejected: '已驳回',
    completed: '已完成',
    cancelled: '已取消',
  };

  // 状态标签
  readonly statusLabel = computed(() => {
    const status = this.data().status;
    return this.statusMap[status] || status || '--';
  });

  readonly reasonText = computed(() => {
    return this.data().reason?.trim() || '';
  });

  readonly submittedTimeText = computed(() => {
    const submittedAt = this.data().submittedAt;
    return submittedAt ? `提交时间 ${this.formatDateTime(submittedAt)}` : '';
  });

  // 当前节点名称（优先使用 approvalPreview 中的 currentStageName）
  readonly currentStageName = computed(() => {
    const data = this.data();
    if (data.approvalPreview?.currentStageName) {
      return data.approvalPreview.currentStageName;
    }
    return data.currentStageName || '--';
  });

  // 等待时长计算（基于任务审批时间）
  readonly waitTime = computed(() => {
    const data = this.data();

    // 如果已完成，计算总耗时
    if (data.status === 'completed' && data.completedAt && data.submittedAt) {
      const submitted = new Date(data.submittedAt);
      const completed = new Date(data.completedAt);
      const diffMs = completed.getTime() - submitted.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 24) {
        return `${diffHours}小时`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}天`;
      }
    }

    // 如果审批中，计算已等待时间
    if (data.status === 'approving' && data.submittedAt) {
      const submitted = new Date(data.submittedAt);
      const now = new Date();
      const diffMs = now.getTime() - submitted.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 24) {
        return `${diffHours}小时`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}天`;
      }
    }

    return '--';
  });

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}
