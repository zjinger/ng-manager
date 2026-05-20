import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import type {
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementItemEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import {
  AttachmentPreviewItem,
  AttachmentPreviewKind,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';
import { RecordListComponent } from '@app/features/reimbursement/travel-expense/components/record-list/record-list.component';

@Component({
  selector: 'app-reimbursement-detail-drawer-page',
  standalone: true,
  imports: [CommonModule, NzSpinModule, NzTagModule, AttachmentPreviewWallComponent, RecordListComponent],
  template: `
    @if (loading()) {
      <div class="state-card state-card--loading">
        <nz-spin nzTip="正在加载报销单详情…"></nz-spin>
      </div>
    } @else if (detail(); as detail) {
      <div class="detail-page">
        <section class="detail-main">
          <section class="detail-card">
            <div class="detail-card__header">
              <h3>基础信息</h3>
              <nz-tag [nzColor]="claimTypeColor(detail.claimType)">{{ claimTypeLabel(detail.claimType) }}</nz-tag>
            </div>
            <div class="kv-grid">
              <div class="kv-item">
                <span class="kv-label">单据编号</span>
                <span class="kv-value kv-value--mono">{{ detail.claimNo }}</span>
              </div>
              <div class="kv-item">
                <span class="kv-label">单据状态</span>
                <span class="kv-value">
                  <nz-tag [nzColor]="statusColor(detail.status)">{{ statusLabel(detail.status) }}</nz-tag>
                </span>
              </div>
              <div class="kv-item">
                <span class="kv-label">申请人</span>
                <span class="kv-value">{{ detail.applicantName }}</span>
              </div>
              <div class="kv-item">
                <span class="kv-label">职务</span>
                <span class="kv-value">{{ detail.applicantTitleName || '--' }}</span>
              </div>
              <div class="kv-item">
                <span class="kv-label">报销部门</span>
                <span class="kv-value">{{ detail.departmentName }}</span>
              </div>
              <div class="kv-item">
                <span class="kv-label">填报日期</span>
                <span class="kv-value">{{ detail.fillDate }}</span>
              </div>
              <div class="kv-item kv-item--full">
                <span class="kv-label">报销事由</span>
                <span class="kv-value">{{ detail.reason || '--' }}</span>
              </div>
              @if (detail.claimType === 'travel') {
                <div class="kv-item">
                  <span class="kv-label">出差开始</span>
                  <span class="kv-value">{{ detail.travelStartDate || '--' }} {{ halfLabel(detail.travelStartHalf) }}</span>
                </div>
                <div class="kv-item">
                  <span class="kv-label">出差结束</span>
                  <span class="kv-value">{{ detail.travelEndDate || '--' }} {{ halfLabel(detail.travelEndHalf) }}</span>
                </div>
                <div class="kv-item">
                  <span class="kv-label">出差天数</span>
                  <span class="kv-value">{{ detail.travelDays ?? '--' }}</span>
                </div>
                <div class="kv-item">
                  <span class="kv-label">单据张数</span>
                  <span class="kv-value">{{ detail.receiptCount ?? '--' }}</span>
                </div>
              } @else {
                <div class="kv-item">
                  <span class="kv-label">单据数量</span>
                  <span class="kv-value">{{ detail.receiptCount ?? '--' }}</span>
                </div>
              }
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-card__header">
              <h3>金额汇总</h3>
            </div>
            <div class="amount-grid">
              <div class="amount-tile">
                <span class="amount-tile__label">总金额</span>
                <strong>¥{{ detail.totalAmount.toFixed(2) }}</strong>
              </div>
              <div class="amount-tile">
                <span class="amount-tile__label">预支金额</span>
                <strong>¥{{ detail.advanceAmount.toFixed(2) }}</strong>
              </div>
              <div class="amount-tile">
                <span class="amount-tile__label">应退/应补</span>
                <strong [class.amount-tile__strong--positive]="detail.balanceAmount > 0">¥{{ detail.balanceAmount.toFixed(2) }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-card__header">
              <h3>行程与费用明细</h3>
            </div>
            @if (detail.items.length > 0) {
              <div class="items-table">
                <div class="items-table__head">
                  <div>类型</div>
                  <div>说明</div>
                  <div>日期/区间</div>
                  <div>地点</div>
                  <div>金额</div>
                </div>
                <div class="items-table__body">
                  @for (item of detail.items; track item.id) {
                    <div class="items-row">
                      <div>{{ itemTypeLabel(item) }}</div>
                      <div class="items-row__description">
                        <div>{{ item.description || '--' }}</div>
                        @if (travelMetaSummary(item); as metaSummary) {
                          <div class="items-row__meta">{{ metaSummary }}</div>
                        }
                      </div>
                      <div>{{ dateLabel(item) }}</div>
                      <div>{{ locationLabel(item) }}</div>
                      <div class="items-row__amount">¥{{ item.amount.toFixed(2) }}</div>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="empty-block">暂无明细</div>
            }
          </section>

          <section class="detail-card">
            <div class="detail-card__header">
              <h3>操作记录</h3>
            </div>
            <app-record-list [records]="detail.logs" />
          </section>
        </section>

        <aside class="detail-side">
          <section class="detail-card">
            <div class="detail-card__header">
              <h3>审批流程</h3>
            </div>
            <div class="flow-list">
              @for (node of detail.approvalPreview.nodes; track node.stageCode; let idx = $index; let last = $last) {
                <div class="flow-item">
                  <div class="flow-item__rail">
                    <span class="flow-item__circle" [class]="flowCircleClass(node.status)">{{ idx + 1 }}</span>
                    @if (!last) {
                      <span class="flow-item__line" [class.flow-item__line--active]="isFlowLineActive(node.status)"></span>
                    }
                  </div>
                  <div class="flow-item__content">
                    <div class="flow-item__title">{{ node.stageName }}</div>
                    <div class="flow-item__status">{{ previewStatusLabel(node.status) }}</div>
                    @if (node.assignees.length > 0) {
                      <div class="flow-item__assignees">{{ assigneeNames(node.assignees) }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-card__header">
              <h3>附件材料</h3>
            </div>
            @if (attachmentItems().length > 0) {
              <app-attachment-preview-wall
                [items]="attachmentItems()"
                [removable]="false"
                [showMeta]="true"
              />
            } @else {
              <div class="empty-block">暂无附件</div>
            }
          </section>
        </aside>
      </div>
    } @else {
      <div class="state-card">未找到该报销单</div>
    }
  `,
  styles: [
    `
      .detail-page {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        align-items: start;
      }
      .detail-main,
      .detail-side {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }
      .detail-card,
      .state-card {
        padding: 20px;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 16px;
        background: var(--bg-container, #fff);
      }
      .state-card {
        min-height: 160px;
        display: grid;
        place-items: center;
        color: var(--text-muted, #6b7280);
      }
      .state-card--loading {
        min-height: 260px;
      }
      .detail-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      .detail-card__header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--text-primary, #111827);
      }
      .kv-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
      }
      .kv-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .kv-item--full {
        grid-column: 1 / -1;
      }
      .kv-label {
        font-size: 12px;
        color: var(--text-muted, #6b7280);
      }
      .kv-value {
        color: var(--text-primary, #111827);
        word-break: break-word;
      }
      .kv-value--mono {
        font-family: 'SF Mono', 'Fira Code', monospace;
      }
      .amount-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .amount-tile {
        border: 1px solid var(--border-color-soft, #eef2f7);
        border-radius: 12px;
        padding: 14px 16px;
        background: var(--bg-subtle, #fafafa);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .amount-tile__label {
        font-size: 12px;
        color: var(--text-muted, #6b7280);
      }
      .amount-tile strong {
        font-size: 22px;
        line-height: 1;
        color: var(--text-primary, #111827);
      }
      .amount-tile__strong--positive {
        color: #2563eb;
      }
      .items-table__head,
      .items-row {
        display: grid;
        grid-template-columns: 110px minmax(220px, 1.2fr) 160px 180px 110px;
        gap: 12px;
        align-items: start;
      }
      .items-table__head {
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color-soft, #eef2f7);
        color: var(--text-muted, #6b7280);
        font-size: 12px;
        font-weight: 700;
      }
      .items-row {
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color-soft, #eef2f7);
        color: var(--text-primary, #111827);
        font-size: 13px;
      }
      .items-row:last-child {
        border-bottom: 0;
      }
      .items-row__description,
      .items-row__meta {
        min-width: 0;
      }
      .items-row__meta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted, #6b7280);
      }
      .items-row__amount {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-weight: 700;
      }
      .flow-list {
        display: flex;
        flex-direction: column;
      }
      .flow-item {
        display: flex;
        align-items: flex-start;
      }
      .flow-item__rail {
        width: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
      }
      .flow-item__circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
      }
      .flow-item__circle--approved {
        background: #52c41a;
      }
      .flow-item__circle--current {
        background: #5b5ce9;
        box-shadow: 0 0 0 4px rgba(91, 92, 233, 0.12);
      }
      .flow-item__circle--pending {
        background: #d7dee8;
      }
      .flow-item__circle--rejected {
        background: #ef4444;
      }
      .flow-item__circle--cancelled {
        background: #8c8c8c;
      }
      .flow-item__line {
        width: 2px;
        min-height: 34px;
        background: #d7dee8;
        flex: 1;
      }
      .flow-item__line--active {
        background: #52c41a;
      }
      .flow-item__content {
        padding: 2px 0 22px 14px;
        min-width: 0;
      }
      .flow-item__title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }
      .flow-item__status {
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-muted, #6b7280);
      }
      .flow-item__assignees {
        margin-top: 6px;
        font-size: 12px;
        color: #374151;
      }
      .empty-block {
        color: var(--text-muted, #6b7280);
        font-size: 13px;
        padding: 8px 0;
      }
      @media (max-width: 1280px) {
        .detail-page {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 960px) {
        .kv-grid,
        .amount-grid,
        .items-table__head,
        .items-row {
          grid-template-columns: 1fr;
        }
        .items-table__head {
          display: none;
        }
        .items-row {
          padding: 12px;
          border: 1px solid var(--border-color-soft, #eef2f7);
          border-radius: 12px;
          margin-bottom: 10px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementDetailDrawerPageComponent {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);

  readonly claimId = input<string | null>(null);
  readonly loading = signal(false);
  readonly detail = signal<ReimbursementClaimDetail | null>(null);
  private readonly loadedClaimId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const claimId = this.claimId();
      if (!claimId || this.loadedClaimId() === claimId) {
        return;
      }
      this.loadedClaimId.set(claimId);
      this.load(claimId);
    });
  }

  readonly attachmentItems = computed<AttachmentPreviewItem[]>(() => {
    return (this.detail()?.attachments ?? []).map((att) => ({
      id: String(att.id ?? att.uploadId ?? 'attachment'),
      name: att.originalName || att.fileName || '附件',
      url: `/api/admin/uploads/${att.uploadId}/raw`,
      kind: this.getFileKindByMimeType(att.mimeType ?? null),
      meta: this.formatFileSize(att.fileSize ?? null),
      removable: false,
    }));
  });

  private load(claimId: string): void {
    this.loading.set(true);
    this.reimbursementApi.getClaimById(claimId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('加载报销详情失败:', error);
        this.message.error('加载报销详情失败');
        this.detail.set(null);
        this.loading.set(false);
      },
    });
  }

  claimTypeLabel(claimType: string): string {
    return claimType === 'travel' ? '差旅费报销' : '费用报销';
  }

  claimTypeColor(claimType: string): string {
    return claimType === 'travel' ? 'blue' : 'cyan';
  }

  statusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approving: '审批中',
      rejected: '已驳回',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labelMap[status] || status;
  }

  statusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: 'default',
      submitted: 'processing',
      approving: 'processing',
      rejected: 'error',
      completed: 'success',
      cancelled: 'default',
    };
    return colorMap[status] || 'default';
  }

  halfLabel(value: 'am' | 'pm' | null): string {
    if (value === 'am') {
      return '上午';
    }
    if (value === 'pm') {
      return '下午';
    }
    return '';
  }

  itemTypeLabel(item: ReimbursementItemEntity): string {
    return item.itemType === 'travel' ? (item.category || '差旅费') : (item.category || '费用');
  }

  dateLabel(item: ReimbursementItemEntity): string {
    if (item.occurredDate) {
      return item.occurredDate;
    }
    if (item.startDate || item.endDate) {
      return `${item.startDate || '--'} ~ ${item.endDate || '--'}`;
    }
    return '--';
  }

  locationLabel(item: ReimbursementItemEntity): string {
    if (item.fromLocation || item.toLocation) {
      return `${item.fromLocation || '--'} → ${item.toLocation || '--'}`;
    }
    return '--';
  }

  travelMetaSummary(item: ReimbursementItemEntity): string | null {
    if (item.itemType !== 'travel' || !item.meta) {
      return null;
    }
    const parts = [
      ['天数', item.meta['days']],
      ['机票', item.meta['airfareAmount']],
      ['车船', item.meta['carriageAmount']],
      ['市内交通', item.meta['localTransportAmount']],
      ['住宿', item.meta['lodgingAmount']],
      ['餐补', item.meta['mealAllowanceAmount']],
      ['餐费', item.meta['mealAmount']],
      ['其他', item.meta['otherAmount']],
    ]
      .filter(([, value]) => value !== null && Number(value) !== 0)
      .map(([label, value]) =>
        label === '天数' ? `${label} ${value}` : `${label} ¥${Number(value).toFixed(2)}`
      );
    return parts.length > 0 ? parts.join(' / ') : null;
  }

  assigneeNames(assignees: Array<{ userId: string; name: string }>): string {
    return assignees.map((item) => item.name).join('、');
  }

  previewStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      approved: '已通过',
      current: '当前处理节点',
      pending: '待处理',
      rejected: '已驳回',
      cancelled: '已取消',
    };
    return labelMap[status] || status;
  }

  flowCircleClass(status: string): string {
    const classMap: Record<string, string> = {
      approved: 'flow-item__circle flow-item__circle--approved',
      current: 'flow-item__circle flow-item__circle--current',
      pending: 'flow-item__circle flow-item__circle--pending',
      rejected: 'flow-item__circle flow-item__circle--rejected',
      cancelled: 'flow-item__circle flow-item__circle--cancelled',
    };
    return classMap[status] || 'flow-item__circle flow-item__circle--pending';
  }

  isFlowLineActive(status: string): boolean {
    return status === 'approved' || status === 'current';
  }

  private getFileKindByMimeType(mimeType: string | null): AttachmentPreviewKind {
    if (!mimeType) {
      return 'file';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'file';
  }

  private formatFileSize(bytes: number | null): string {
    if (!bytes) {
      return '0 B';
    }
    const unit = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(unit));
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
  }
}
