import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@app/core/auth';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
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
// import { ReimbursementApiService } from '@app/features/reimbursement/api/reimbursement-api.service';
import type {
  ReimbursementClaimDetail,
  ReimbursementItemEntity,
  ReimbursementAttachmentEntity,
  ReimbursementLogEntity,
  ReimbursementItemInput,
  ReimbursementApprovalTaskEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import { CreateReimbursementClaimInput } from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-travel-expense-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSpinModule,
    ProcessHeaderCardComponent,
    ExpensePreviewComponent,
    ExpenseBillPreviewComponent,
    AttachmentPreviewWallComponent,
    ApprovalFlowComponent,
    RecordListComponent,
  ],
  templateUrl: './travel-expense-detail.html',
  styleUrls: ['./travel-expense-detail.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelExpenseDetail implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly authStore = inject(AuthStore);
  private readonly reimbursementApi = inject(ReimbursementApiService);
  readonly loading = signal(true);
  readonly approving = signal(false);
  readonly rejecting = signal(false);
  readonly approvalComment = signal('');
  readonly claimDetail = signal<ReimbursementClaimDetail | null>(null);
  readonly headerData = computed(() => {
    const detail = this.claimDetail();
    if (!detail) return {} as ReimbursementClaimDetail;
    return detail;
  });

  /**
   * 表单数据 - 适配 ExpensePreviewComponent
   * ExpensePreviewComponent 需要 CreateReimbursementClaimInput 类型
   */
  readonly formData = computed<CreateReimbursementClaimInput>(() => {
    const detail = this.claimDetail();
    if (!detail) {
      return {
        claimType: 'travel',
        departmentId: '',
        departmentName: '',
        applicantName: '',
        titleName: '',
        reason: '',
        fillDate: '',
        advanceAmount: 0,
        travelStartDate: null,
        travelStartHalf: null,
        travelEndDate: null,
        travelEndHalf: null,
        travelDays: null,
        receiptCount: null,
        items: [],
      };
    }

    return {
      claimType: detail.claimType,
      departmentId: detail.departmentId,
      departmentName: detail.departmentName,
      applicantName: detail.applicantName,
      titleName: detail.applicantTitleName, // API 返回中没有 titleName，可能需要从其他字段获取 TODO
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

  /**
   * 费用明细 - 提供给模板使用
   */
  readonly expenseItems = computed(() => {
    return this.formData().items || [];
  });

  /**
   * 汇总信息（用于附件等）
   */
  readonly summary = computed(() => {
    const detail = this.claimDetail();
    return {
      totalAmount: detail?.totalAmount || 0,
      advanceAmount: detail?.advanceAmount || 0,
      balanceAmount: detail?.balanceAmount || 0,
      attachments: detail?.attachments || [],
    };
  });

  /**
   * 附件列表
   */
  readonly attachmentItems = computed<any[]>(() => {
    const attachments = this.claimDetail()?.attachments || [];

    return attachments.map((att: ReimbursementAttachmentEntity) => ({
      id: att.id,
      name: att.originalName || att.fileName || '附件',
      url: `/api/admin/uploads/${att.uploadId}/raw`, // 根据实际 API 调整
      kind: this.getFileKindByMimeType(att.mimeType!),
      meta: this.formatFileSize(att.fileSize!),
      removable: false,
    }));
   
  });

  /**
   * 审批流预览
   */
  readonly approvalPreview = computed(() => {
    return this.claimDetail()?.approvalPreview || null;
  });

  readonly currentTask = computed<ReimbursementApprovalTaskEntity | null>(() => {
    const userId = this.authStore.currentUser()?.userId;
    const detail = this.claimDetail();
    if (!userId || !detail) {
      return null;
    }
    return detail.tasks.find(
      (task) =>
        task.assigneeUserId === userId &&
        (task.status === 'pending' || task.status === 'addsign_pending')
    ) ?? null;
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

  /**
   * 是否存在附件
   */
  readonly hasAttachments = computed(() => {
    return this.attachmentItems().length > 0;
  });

  /**
   * 操作记录 - 适配 RecordListComponent
   */
  readonly recordListData = computed<ReimbursementLogEntity[]>(() => {
    return this.claimDetail()?.logs || [];
  });

  ngOnInit(): void {
    this.loadDetailData();
  }

  /**
   * 加载详情数据
   */
  private loadDetailData(): void {
    const claimId =
      this.route.snapshot.paramMap.get('claimId') ?? this.route.snapshot.paramMap.get('id');

    if (!claimId) {
      this.message.error('缺少报销单ID');
      this.loading.set(false);
      return;
    }

    this.reimbursementApi.getClaimById(claimId).subscribe({
      next: (detail) => {
        this.claimDetail.set(detail);
        this.approvalComment.set('');
        this.loading.set(false);
      },
      error: (error) => {
        console.error('加载详情失败:', error);
        this.message.error('详情加载失败');
        this.loading.set(false);
      },
    });
  }

  /**
   * 返回
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * 编辑
   */
  goEdit(): void {
    const claimId = this.claimDetail()?.id;
    if (claimId) {
      this.router.navigate(['/reimbursements', claimId, 'edit']);
    }
  }

  private approve(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.claimDetail();
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
        this.claimDetail.set(updated);
        this.message.success('审批通过');
      },
      error: () => {
        this.approving.set(false);
        this.message.error('审批通过失败');
      },
    });
  }

  private reject(task: ReimbursementApprovalTaskEntity): void {
    const detail = this.claimDetail();
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
        this.claimDetail.set(updated);
        this.message.success('已驳回');
      },
      error: () => {
        this.rejecting.set(false);
        this.message.error('驳回失败');
      },
    });
  }

  /**
   * 将 Item Entity 转换为 Input 类型
   */
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
      meta: item.meta,
      sort: item.sort,
    };
  }

  /**
   * 根据 MIME 类型获取文件预览类型
   */
  private getFileKindByMimeType(mimeType: string | null): AttachmentPreviewKind {
    if (!mimeType) return 'file';

    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'file';
  }

  /**
   * 文件大小格式化
   */
  private formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) {
      return '0 B';
    }
    const unit = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(unit));
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
  }
}
