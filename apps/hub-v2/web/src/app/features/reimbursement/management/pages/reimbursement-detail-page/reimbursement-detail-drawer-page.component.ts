import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AuthStore } from '@app/core/auth';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { lastValueFrom } from 'rxjs';

import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import type {
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementApprovalTaskEntity,
  ReimbursementItemEntity,
  CreateReimbursementClaimInput,
  ReimbursementItemInput,
  TravelReimbursementItemMeta,
} from '@app/features/reimbursement/models/reimbursement.model';
import {
  AttachmentPreviewItem,
  AttachmentPreviewKind,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';
import { ApprovalFlowComponent } from '@app/features/reimbursement/shared/components/approval-flow/approval-flow.component';
import { ExpenseBillPreviewComponent } from '@app/features/reimbursement/shared/components';
import { ExpensePreviewComponent } from '@app/features/reimbursement/shared/components/expense-preview/expense-preview.component';
import { ProcessHeaderCardComponent } from '@app/features/reimbursement/shared/components/process-header-card/process-header-card.component';
import { RecordListComponent } from '@app/features/reimbursement/shared/components/record-list/record-list.component';

interface SaveFilePickerOptionsLike {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}

interface FileSystemWritableFileStreamLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

type WindowWithSaveFilePicker = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptionsLike) => Promise<FileSystemFileHandleLike>;
};

@Component({
  selector: 'app-reimbursement-detail-drawer-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSpinModule,
    AttachmentPreviewWallComponent,
    ApprovalFlowComponent,
    ExpenseBillPreviewComponent,
    ExpensePreviewComponent,
    ProcessHeaderCardComponent,
    RecordListComponent,
  ],
  template: `
    @if (loading()) {
      <div class="state-card state-card--loading">
        <nz-spin nzTip="正在加载报销单详情…"></nz-spin>
      </div>
    } @else if (detail(); as detail) {
      <div class="detail-page">
        <app-process-header-card [data]="detail" />

        <section class="detail-card detail-card--compact detail-card--base">
          <div class="detail-card__header">
            <h3>基础信息</h3>
            <div class="detail-actions">
              <button nz-button nzSize="small" (click)="openDocumentPreview()">
                <span nz-icon nzType="fullscreen"></span>
                单据预览
              </button>
              <button nz-button nzSize="small" [nzLoading]="exporting()" (click)="exportWord(detail)">
                <span nz-icon nzType="download"></span>
                导出
              </button>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv-item">
              <span class="kv-label">单据编号</span>
              <span class="kv-value kv-value--mono">{{ detail.claimNo }}</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">单据状态</span>
              <span class="kv-value">{{ statusLabel(detail.status) }}</span>
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
              <span class="kv-label">{{ detail.claimType === 'general' ? '备注' : '报销事由' }}</span>
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

        <section class="detail-card detail-card--compact detail-card--flow">
          <div class="detail-card__header">
            <h3>审批流程</h3>
          </div>
          <app-approval-flow [approvalPreview]="detail.approvalPreview" />
        </section>

        <section class="detail-card detail-card--amount">
          <div class="detail-card__header">
            <h3>金额汇总</h3>
          </div>
          <div class="amount-grid">
            <div class="amount-tile amount-tile--total">
              <span class="amount-tile__label">总金额</span>
              <strong>¥{{ detail.totalAmount.toFixed(2) }}</strong>
            </div>
            <div class="amount-tile amount-tile--advance">
              <span class="amount-tile__label">预支金额</span>
              <strong>¥{{ detail.advanceAmount.toFixed(2) }}</strong>
            </div>
            <div class="amount-tile amount-tile--balance">
              <span class="amount-tile__label">{{ balanceAmountLabel(detail) }}</span>
              <strong
                [class.amount-tile__strong--positive]="detail.balanceAmount > 0"
                [class.amount-tile__strong--negative]="detail.balanceAmount < 0"
              >
                ¥{{ balanceDisplayAmount(detail).toFixed(2) }}
              </strong>
            </div>
          </div>
        </section>

        @if (currentTask(); as task) {
          <section class="detail-card detail-card--action">
            <div class="detail-card__header">
              <h3>审批操作</h3>
            </div>
            <textarea
              nz-input
              class="approval-comment"
              [ngModel]="approvalComment()"
              (ngModelChange)="approvalComment.set($event)"
              placeholder="请输入审批意见，例如：票据完整，同意报销"
            ></textarea>
            <div class="approval-actions">
              <button nz-button nzType="primary" [nzLoading]="approving()" (click)="confirmApprove(task)">
                <span nz-icon nzType="check"></span>
                通过
              </button>
              <button nz-button nzDanger [nzLoading]="rejecting()" (click)="confirmReject(task)">
                <span nz-icon nzType="close"></span>
                驳回
              </button>
            </div>
          </section>
        }

        <section class="detail-card detail-card--items">
          <div class="detail-card__header">
            <h3>{{ detail.claimType === 'travel' ? '行程与费用明细' : '费用明细' }}</h3>
          </div>
          @if (detail.items.length > 0) {
            @if (detail.claimType === 'travel') {
              <div class="items-table-wrapper">
                <table class="expense-table expense-table--travel">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>起讫地点</th>
                      <th>天数</th>
                      <th>机票</th>
                      <th>车船</th>
                      <th>市内交通</th>
                      <th>住宿</th>
                      <th>餐补</th>
                      <th>餐费</th>
                      <th>其他</th>
                      <th>小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of detail.items; track item.id) {
                      <tr>
                        <td>{{ item.occurredDate || '--' }}</td>
                        <td>{{ locationLabel(item) }}</td>
                        <td>{{ numberCell(travelMetaNumber(item, 'days')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'airfareAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'carriageAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'localTransportAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'lodgingAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'mealAllowanceAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'mealAmount')) }}</td>
                        <td>{{ moneyCell(travelMetaNumber(item, 'otherAmount')) }}</td>
                        <td class="expense-table__amount">{{ moneyCell(travelSubtotal(item)) }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" class="expense-table__total-label">合计</td>
                      <td>{{ numberCell(travelTotal('days')) }}</td>
                      <td>{{ moneyCell(travelTotal('airfareAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('carriageAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('localTransportAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('lodgingAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('mealAllowanceAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('mealAmount')) }}</td>
                      <td>{{ moneyCell(travelTotal('otherAmount')) }}</td>
                      <td class="expense-table__grand-total">{{ grandTotalCell(detail.totalAmount) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            } @else {
              <div class="items-table-wrapper">
                <table class="expense-table expense-table--general">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>用途</th>
                      <th>金额（元）</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of detail.items; track item.id; let idx = $index) {
                      <tr>
                        <td class="expense-table__seq">{{ idx + 1 }}</td>
                        <td>{{ item.description || '' }}</td>
                        <td class="expense-table__amount">{{ moneyCell(item.amount) }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" class="expense-table__total-label">合计</td>
                      <td class="expense-table__grand-total">{{ moneyCell(detail.totalAmount) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            }
          } @else {
            <div class="empty-block">暂无明细</div>
          }
        </section>

        <section class="detail-card detail-card--attachments">
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

        <section class="detail-card detail-card--logs">
          <div class="detail-card__header">
            <h3>操作记录</h3>
          </div>
          <app-record-list [records]="detail.logs" />
        </section>
      </div>

      <nz-modal
        [nzVisible]="documentPreviewOpen()"
        [nzTitle]="documentPreviewTitle()"
        [nzFooter]="null"
        [nzWidth]="1120"
        [nzBodyStyle]="documentPreviewBodyStyle"
        [nzCentered]="true"
        (nzOnCancel)="documentPreviewOpen.set(false)"
      >
        <ng-container *nzModalContent>
          @if (documentPreviewData(); as formData) {
            <div class="document-preview-modal">
              @if (formData.claimType === 'travel') {
                <app-expense-preview [formData]="formData" />
              } @else {
                <app-expense-bill-preview [formData]="formData" />
              }
            </div>
          }
        </ng-container>
      </nz-modal>
    } @else {
      <div class="state-card">未找到该报销单</div>
    }
  `,
  styles: [
    `
      .detail-page {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 420px;
        grid-template-areas:
          'header header'
          'base flow'
          'amount action'
          'items items'
          'attachments logs';
        gap: 16px;
        align-items: stretch;
      }
      app-process-header-card {
        grid-area: header;
        display: block;
      }
      .detail-card--base {
        grid-area: base;
      }
      .detail-card--flow {
        grid-area: flow;
      }
      .detail-card--amount {
        grid-area: amount;
      }
      .detail-card--action {
        grid-area: action;
      }
      .detail-card--items {
        grid-area: items;
      }
      .detail-card--attachments {
        grid-area: attachments;
      }
      .detail-card--logs {
        grid-area: logs;
      }
      .detail-card--items,
      .detail-card--logs {
        min-width: 0;
      }
      .detail-card,
      .state-card {
        padding: 20px;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 16px;
        background: var(--bg-container, #fff);
        box-sizing: border-box;
      }
      .detail-card {
        height: 100%;
      }
      .detail-card--compact {
        padding: 16px 18px;
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
      .detail-card--compact .detail-card__header {
        margin-bottom: 12px;
      }
      .detail-card__header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--text-primary, #111827);
      }
      .detail-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .kv-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 18px;
      }
      .kv-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
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
        font-size: 14px;
        line-height: 1.55;
        color: var(--text-primary, #111827);
        word-break: break-word;
      }
      .detail-card--base .kv-label {
        font-size: 12.5px;
      }
      .detail-card--base .kv-value {
        font-size: 14.5px;
      }
      .kv-value--mono {
        font-family: 'SF Mono', 'Fira Code', monospace;
      }
      .amount-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        height: calc(100% - 35px);
        align-items: stretch;
      }
      .amount-tile {
        border: 1px solid var(--border-color-soft, #eef2f7);
        border-radius: 12px;
        padding: 14px 16px;
        background: var(--bg-subtle, #fafafa);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }
      .amount-tile--total {
        border-color: rgba(37, 99, 235, 0.18);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.04));
      }
      .amount-tile--advance {
        border-color: rgba(217, 119, 6, 0.2);
        background: linear-gradient(135deg, rgba(217, 119, 6, 0.11), rgba(217, 119, 6, 0.04));
      }
      .amount-tile--balance {
        border-color: rgba(22, 163, 74, 0.2);
        background: linear-gradient(135deg, rgba(22, 163, 74, 0.1), rgba(22, 163, 74, 0.04));
      }
      .amount-tile__label {
        font-size: 12px;
        color: var(--text-muted, #6b7280);
      }
      .amount-tile--total .amount-tile__label,
      .amount-tile--total strong {
        color: #2563eb;
      }
      .amount-tile--advance .amount-tile__label,
      .amount-tile--advance strong {
        color: #d97706;
      }
      .amount-tile--balance .amount-tile__label {
        color: #16a34a;
      }
      .amount-tile strong {
        font-size: 22px;
        line-height: 1;
        color: var(--text-primary, #111827);
      }
      .amount-tile__strong--positive {
        color: #16a34a;
      }
      .amount-tile__strong--negative {
        color: #dc2626;
      }
      .document-preview-modal {
        min-width: 0;
        overflow: auto;
      }
      .items-table-wrapper {
        max-width: 100%;
        overflow-x: auto;
      }
      .expense-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        color: var(--text-primary, #111827);
      }
      .expense-table--travel {
        min-width: 980px;
      }
      .expense-table--general {
        min-width: 520px;
      }
      .expense-table th,
      .expense-table td {
        border: 1px solid var(--border-color-soft, #eef2f7);
        padding: 10px 8px;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
      }
      .expense-table th {
        background: var(--bg-subtle, #fafafa);
        color: var(--text-secondary, #475569);
        font-weight: 700;
      }
      .expense-table tfoot td {
        background: var(--bg-subtle, #fafafa);
        font-weight: 700;
      }
      .expense-table__seq {
        text-align: center;
        color: var(--text-muted, #6b7280);
      }
      .expense-table__amount {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-weight: 700;
      }
      .expense-table__total-label {
        text-align: right;
      }
      .expense-table__grand-total {
        color: #f5222d;
        font-weight: 700;
      }
      .approval-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
      }
      .approval-comment {
        min-height: 88px;
        resize: vertical;
      }
      .detail-card--attachments,
      .detail-card--logs {
        min-height: 144px;
      }
      .empty-block {
        color: var(--text-muted, #6b7280);
        font-size: 13px;
        padding: 8px 0;
      }
      @media (max-width: 1280px) {
        .detail-page {
          grid-template-columns: 1fr;
          grid-template-areas:
            'header'
            'base'
            'flow'
            'amount'
            'action'
            'items'
            'attachments'
            'logs';
        }
      }
      @media (max-width: 960px) {
        .kv-grid,
        .amount-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementDetailDrawerPageComponent {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly authStore = inject(AuthStore);

  readonly claimId = input<string | null>(null);
  readonly changed = output<void>();
  readonly openFullPage = output<ReimbursementClaimDetail>();
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly approving = signal(false);
  readonly rejecting = signal(false);
  readonly approvalComment = signal('');
  readonly documentPreviewOpen = signal(false);
  readonly detail = signal<ReimbursementClaimDetail | null>(null);
  private readonly loadedClaimId = signal<string | null>(null);
  readonly documentPreviewBodyStyle = {
    padding: '20px',
    maxHeight: 'calc(100vh - 180px)',
    overflow: 'auto',
  };

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

  readonly currentTask = computed<ReimbursementApprovalTaskEntity | null>(() => {
    const userId = this.authStore.currentUser()?.userId;
    const detail = this.detail();
    if (!userId || !detail) {
      return null;
    }
    return detail.tasks.find(
      (task) =>
        task.assigneeUserId === userId &&
        (task.status === 'pending' || task.status === 'addsign_pending')
    ) ?? null;
  });

  readonly documentPreviewData = computed<CreateReimbursementClaimInput | null>(() => {
    const detail = this.detail();
    if (!detail) {
      return null;
    }
    return {
      claimType: detail.claimType,
      departmentId: detail.departmentId,
      departmentName: detail.departmentName,
      applicantName: detail.applicantName,
      titleName: detail.applicantTitleName,
      reason: detail.reason,
      fillDate: detail.fillDate,
      advanceAmount: detail.advanceAmount,
      travelStartDate: detail.travelStartDate,
      travelStartHalf: detail.travelStartHalf,
      travelEndDate: detail.travelEndDate,
      travelEndHalf: detail.travelEndHalf,
      travelDays: detail.travelDays,
      receiptCount: detail.receiptCount,
      items: detail.items.map((item) => this.mapItemToInput(item)),
    };
  });

  readonly documentPreviewTitle = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return '单据预览';
    }
    return `${detail.claimNo} 单据预览`;
  });

  private load(claimId: string): void {
    this.loading.set(true);
    this.approvalComment.set('');
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

  confirmApprove(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    this.modal.confirm({
      nzTitle: '确认通过该报销单？',
      nzContent: '通过后单据将流转到下一个审批节点。',
      nzOkText: '确认通过',
      nzCancelText: '取消',
      nzOnOk: () => this.approve(task),
    });
  }

  confirmReject(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    this.modal.confirm({
      nzTitle: '确认驳回该报销单？',
      nzContent: '驳回后单据将退回给报销人修改。',
      nzOkText: '确认驳回',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => this.reject(task),
    });
  }

  async exportWord(detail: ReimbursementClaimDetail): Promise<void> {
    if (this.exporting()) {
      return;
    }
    const fallbackName = this.buildExportFileName(detail);
    const saveHandle = await this.pickExportFile(fallbackName);
    if (saveHandle === false) {
      return;
    }
    this.exporting.set(true);
    try {
      const response = await lastValueFrom(this.reimbursementApi.exportWord(detail.id));
      await this.saveExportFile(response, saveHandle, fallbackName);
      this.message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      this.message.error('导出失败');
    } finally {
      this.exporting.set(false);
    }
  }

  private approve(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    this.approving.set(true);
    this.reimbursementApi.approveClaim(detail.id, {
      taskId: task.id,
      comment: this.approvalComment().trim() || null,
    }).subscribe({
      next: (updated) => {
        this.approving.set(false);
        this.approvalComment.set('');
        this.detail.set(updated);
        this.changed.emit();
        this.message.success('审批通过');
      },
      error: () => {
        this.approving.set(false);
        this.message.error('审批通过失败');
      },
    });
  }

  private reject(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    this.rejecting.set(true);
    this.reimbursementApi.rejectClaim(detail.id, {
      taskId: task.id,
      comment: this.approvalComment().trim() || null,
    }).subscribe({
      next: (updated) => {
        this.rejecting.set(false);
        this.approvalComment.set('');
        this.detail.set(updated);
        this.changed.emit();
        this.message.success('已驳回');
      },
      error: () => {
        this.rejecting.set(false);
        this.message.error('驳回失败');
      },
    });
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

  openDocumentPreview(): void {
    this.documentPreviewOpen.set(true);
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

  locationLabel(item: ReimbursementItemEntity): string {
    if (item.fromLocation || item.toLocation) {
      return `${item.fromLocation || '--'} → ${item.toLocation || '--'}`;
    }
    return '--';
  }

  travelMetaNumber(item: ReimbursementItemEntity, key: string): number {
    const value = item.meta?.[key];
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  travelSubtotal(item: ReimbursementItemEntity): number {
    return (
      this.travelMetaNumber(item, 'airfareAmount') +
      this.travelMetaNumber(item, 'carriageAmount') +
      this.travelMetaNumber(item, 'localTransportAmount') +
      this.travelMetaNumber(item, 'lodgingAmount') +
      this.travelMetaNumber(item, 'mealAllowanceAmount') +
      this.travelMetaNumber(item, 'mealAmount') +
      this.travelMetaNumber(item, 'otherAmount')
    );
  }

  travelTotal(key: string): number {
    return (this.detail()?.items ?? []).reduce(
      (total, item) => total + this.travelMetaNumber(item, key),
      0
    );
  }

  moneyCell(value: number): string {
    const numeric = Number(value || 0);
    return numeric === 0 ? '' : numeric.toFixed(2);
  }

  numberCell(value: number): string {
    const numeric = Number(value || 0);
    return numeric === 0 ? '' : String(numeric);
  }

  grandTotalCell(value: number): string {
    const amount = this.moneyCell(value);
    return amount ? `总计：${amount}` : '';
  }

  balanceAmountLabel(detail: ReimbursementClaimDetail): string {
    return detail.advanceAmount > detail.totalAmount ? '应退金额' : '应补金额';
  }

  balanceDisplayAmount(detail: ReimbursementClaimDetail): number {
    return Math.abs(detail.balanceAmount);
  }

  private mapItemToInput(item: ReimbursementItemEntity): ReimbursementItemInput {
    return {
      id: item.id,
      itemType: item.itemType,
      category: item.category,
      description: item.description,
      occurredDate: item.occurredDate,
      startDate: item.startDate,
      endDate: item.endDate,
      fromLocation: item.fromLocation,
      toLocation: item.toLocation,
      amount: item.amount,
      meta: item.meta as TravelReimbursementItemMeta | null,
      sort: item.sort,
    };
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

  private async saveExportFile(
    response: HttpResponse<Blob>,
    saveHandle: FileSystemFileHandleLike | null,
    fallbackName: string
  ): Promise<void> {
    const blob = response.body;
    if (!blob) {
      return;
    }
    if (saveHandle) {
      const writable = await saveHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
    this.triggerDownload(response, fallbackName);
  }

  private triggerDownload(response: HttpResponse<Blob>, fallbackName: string): void {
    const blob = response.body;
    if (!blob) {
      return;
    }
    const filename = this.resolveFilename(response.headers.get('content-disposition'), fallbackName);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private resolveFilename(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) {
      return fallback;
    }
    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1]);
      } catch {
        return encodedMatch[1];
      }
    }
    const plainMatch = contentDisposition.match(/filename="([^"]+)"/i) || contentDisposition.match(/filename=([^;]+)/i);
    return plainMatch?.[1]?.trim() || fallback;
  }

  private async pickExportFile(fallbackName: string): Promise<FileSystemFileHandleLike | null | false> {
    const picker = (window as WindowWithSaveFilePicker).showSaveFilePicker;
    if (!picker) {
      return null;
    }
    try {
      return await picker({
        suggestedName: fallbackName,
        types: [
          {
            description: 'Word 文档',
            accept: {
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            },
          },
        ],
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
      return null;
    }
  }

  private buildExportFileName(detail: ReimbursementClaimDetail): string {
    return `${this.sanitizeFileName(detail.claimNo)}-${this.sanitizeFileName(detail.applicantName)}-${Date.now()}.docx`;
  }

  private sanitizeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '_');
  }
}
