import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@app/core/auth';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { lastValueFrom } from 'rxjs';

import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import { ReimbursementRefreshBusService } from '@app/features/reimbursement/services/reimbursement-refresh-bus.service';
import type {
  CreateReimbursementClaimInput,
  ReimbursementApprovalTaskEntity,
  ReimbursementClaimDetail,
} from '@app/features/reimbursement/models/reimbursement.model';
import {
  ExpenseBillPreviewComponent,
  ReimbursementAmountSummaryPanelComponent,
  ReimbursementApprovalActionPanelComponent,
  ReimbursementApprovalFlowPanelComponent,
  ReimbursementAttachmentsPanelComponent,
  ReimbursementBasicInfoPanelComponent,
  ReimbursementItemsPanelComponent,
  ReimbursementLogsCardComponent,
} from '@app/features/reimbursement/shared/components';
import { ExpensePreviewComponent } from '@app/features/reimbursement/shared/components/expense-preview/expense-preview.component';
import { ProcessHeaderCardComponent } from '@app/features/reimbursement/shared/components/process-header-card/process-header-card.component';
import { mapReimbursementDetailToClaimInput } from '@app/features/reimbursement/shared/utils/reimbursement-detail-display.util';

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
    NzModalModule,
    NzSpinModule,
    ExpenseBillPreviewComponent,
    ExpensePreviewComponent,
    ProcessHeaderCardComponent,
    ReimbursementAmountSummaryPanelComponent,
    ReimbursementApprovalActionPanelComponent,
    ReimbursementApprovalFlowPanelComponent,
    ReimbursementAttachmentsPanelComponent,
    ReimbursementBasicInfoPanelComponent,
    ReimbursementItemsPanelComponent,
    ReimbursementLogsCardComponent,
  ],
  template: `
    @if (loading()) {
      <div class="state-card state-card--loading">
        <nz-spin nzTip="正在加载报销单详情…"></nz-spin>
      </div>
    } @else if (detail(); as detail) {
      <div class="detail-page">
        <app-process-header-card class="detail-page__header" [data]="detail" />

        <app-reimbursement-basic-info-panel
          class="detail-page__base"
          [detail]="detail"
          [canEdit]="canEditClaim(detail)"
          [exporting]="exporting()"
          (edit)="goEdit(detail)"
          (preview)="openDocumentPreview()"
          (exportWord)="exportWord(detail)"
        />

        <app-reimbursement-approval-flow-panel
          class="detail-page__flow"
          [approvalPreview]="detail.approvalPreview"
        />

        <app-reimbursement-amount-summary-panel class="detail-page__amount" [detail]="detail" />

        @if (currentTask(); as task) {
          <app-reimbursement-approval-action-panel
            class="detail-page__action"
            [task]="task"
            [comment]="approvalComment()"
            (commentChange)="approvalComment.set($event)"
            [approving]="approving()"
            [rejecting]="rejecting()"
            (approve)="confirmApprove($event)"
            (reject)="confirmReject($event)"
          />
        }

        <app-reimbursement-items-panel class="detail-page__items" [detail]="detail" />
        <app-reimbursement-attachments-panel class="detail-page__attachments" [attachments]="detail.attachments" />
        <app-reimbursement-logs-card class="detail-page__logs" [records]="detail.logs" />
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

      .detail-page__header {
        grid-area: header;
      }

      .detail-page__base {
        grid-area: base;
        min-height: 0;
      }

      .detail-page__flow {
        grid-area: flow;
        min-height: 0;
      }

      .detail-page__amount {
        grid-area: amount;
      }

      .detail-page__action {
        grid-area: action;
      }

      .detail-page__items {
        grid-area: items;
      }

      .detail-page__attachments {
        grid-area: attachments;
      }

      .detail-page__logs {
        grid-area: logs;
      }

      .detail-page__items,
      .detail-page__logs {
        min-width: 0;
      }

      .state-card {
        min-height: 160px;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-container);
        color: var(--text-muted);
      }

      .state-card--loading {
        min-height: 260px;
      }

      .document-preview-modal {
        min-width: 0;
        overflow: auto;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementDetailDrawerPageComponent {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly authStore = inject(AuthStore);
  private readonly reimbursementRefreshBus = inject(ReimbursementRefreshBusService);
  private readonly router = inject(Router);

  readonly claimId = input<string | null>(null);
  readonly changed = output<void>();
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
    effect(() => {
      const event = this.reimbursementRefreshBus.event();
      const claimId = this.claimId();
      if (event.version === 0 || event.source !== 'ws' || !claimId) {
        return;
      }
      if (event.claimId && event.claimId !== claimId) {
        return;
      }
      this.load(claimId);
    });
  }

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
    return detail ? mapReimbursementDetailToClaimInput(detail) : null;
  });

  readonly documentPreviewTitle = computed(() => {
    const detail = this.detail();
    return detail ? `${detail.claimNo} 单据预览` : '单据预览';
  });

  confirmApprove(task: ReimbursementApprovalTaskEntity): void {
    this.modal.confirm({
      nzTitle: '确认通过该报销单？',
      nzContent: '通过后单据将流转到下一个审批节点。',
      nzOkText: '确认通过',
      nzCancelText: '取消',
      nzOnOk: () => this.approve(task),
    });
  }

  confirmReject(task: ReimbursementApprovalTaskEntity): void {
    this.modal.confirm({
      nzTitle: '确认驳回该报销单？',
      nzContent: '驳回后单据将退回给报销人修改。',
      nzOkText: '确认驳回',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => this.reject(task),
    });
  }

  openDocumentPreview(): void {
    this.documentPreviewOpen.set(true);
  }

  goEdit(detail: ReimbursementClaimDetail): void {
    void this.router.navigate(['/reimbursements', detail.id, 'edit']);
  }

  canEditClaim(detail: ReimbursementClaimDetail): boolean {
    if (detail.status !== 'draft' && detail.status !== 'rejected') {
      return false;
    }
    const currentUser = this.authStore.currentUser();
    const userId = currentUser?.userId;
    if (userId && detail.applicantUserId === userId) {
      return true;
    }
    const permissions = currentUser?.permissionCodes ?? [];
    return (
      currentUser?.role === 'admin' ||
      permissions.includes('expense.review.manage')
    );
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
