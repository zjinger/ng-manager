import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@app/core/auth';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { PanelCardComponent } from '@app/shared/ui';
import {
  ExpenseBillPreviewComponent,
  ReimbursementApprovalActionPanelComponent,
  ReimbursementApprovalFlowPanelComponent,
  ReimbursementAttachmentsPanelComponent,
  ReimbursementLogsCardComponent,
} from '@app/features/reimbursement/shared/components';
import { ExpensePreviewComponent } from '@app/features/reimbursement/shared/components/expense-preview/expense-preview.component';
import { ProcessHeaderCardComponent } from '@app/features/reimbursement/shared/components/process-header-card/process-header-card.component';
import type {
  ReimbursementClaimDetail,
  ReimbursementLogEntity,
  ReimbursementApprovalTaskEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import { CreateReimbursementClaimInput } from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import { ReimbursementRefreshBusService } from '@app/features/reimbursement/services/reimbursement-refresh-bus.service';
import { CommonModule } from '@angular/common';
import { mapReimbursementDetailToClaimInput } from '@app/features/reimbursement/shared/utils/reimbursement-detail-display.util';

@Component({
  selector: 'app-reimbursement-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    ProcessHeaderCardComponent,
    ExpensePreviewComponent,
    ExpenseBillPreviewComponent,
    PanelCardComponent,
    ReimbursementApprovalActionPanelComponent,
    ReimbursementApprovalFlowPanelComponent,
    ReimbursementAttachmentsPanelComponent,
    ReimbursementLogsCardComponent,
  ],
  templateUrl: './reimbursement-detail.html',
  styleUrls: ['./reimbursement-detail.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementDetailPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly authStore = inject(AuthStore);
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly reimbursementRefreshBus = inject(ReimbursementRefreshBusService);
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

  constructor() {
    effect(() => {
      const event = this.reimbursementRefreshBus.event();
      const claimId = this.route.snapshot.paramMap.get('claimId') ?? this.route.snapshot.paramMap.get('id');
      if (event.version === 0 || event.source !== 'ws' || !claimId) {
        return;
      }
      if (event.claimId && event.claimId !== claimId) {
        return;
      }
      this.loadDetailData();
    });
  }

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
      ...mapReimbursementDetailToClaimInput(detail),
    };
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

}
