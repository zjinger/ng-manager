import { computed, inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import {
  CreateReimbursementClaimInput,
  ReimbursementApprovalPreview,
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementItemEntity,
  ReimbursementItemInput,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';

export interface ExpenseAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadTime: Date;
}

export interface ExpenseSummary {
  totalAmount: number;
  advanceAmount: number;
  differenceAmount: number;
  attachments: ReimbursementAttachmentEntity[];
}

export interface TravelExpenseDraft {
  basicInfo: CreateReimbursementClaimInput;
  expenseItems: ReimbursementItemInput[];
  summary: ExpenseSummary;
  approvalPreview?: ReimbursementApprovalPreview;
  status: 'draft' | 'submitted';
}

const DEFAULT_DRAFT: TravelExpenseDraft = {
  basicInfo: {
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
  },
  expenseItems: [],
  summary: {
    totalAmount: 0,
    advanceAmount: 0,
    differenceAmount: 0,
    attachments: [],
  },
  approvalPreview:{},
  status: 'draft',
};

@Injectable()
export class TravelExpenseStore {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  // =========================
  // State
  // =========================

  /** 完整草稿数据 */
  private readonly draftState = signal<TravelExpenseDraft>({ ...DEFAULT_DRAFT });

  /** 基础信息是否有效 */
  private readonly basicInfoValidState = signal(false);

  /** 提交中状态 */
  private readonly submittingState = signal(false);

  /** 加载中状态 */
  private readonly loadingState = signal(false);

  /** 当前编辑的报销单ID */
  private readonly currentClaimIdState = signal<string | null>(null);

  // =========================
  // Public Selectors
  // =========================

  /** 草稿数据 */
  readonly draft = computed(() => this.draftState());

  /** 基础信息是否有效 */
  readonly basicInfoValid = computed(() => this.basicInfoValidState());

  /** 提交中 */
  readonly submitting = computed(() => this.submittingState());

  /** 加载中 */
  readonly loading = computed(() => this.loadingState());

  /** 当前编辑ID */
  readonly currentClaimId = computed(() => this.currentClaimIdState());

  /** 是否为编辑模式 */
  readonly isEditMode = computed(() => !!this.currentClaimIdState());

  /** 总计金额 */
  readonly totalAmount = computed(() => {
    const items = this.draftState().expenseItems;
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  /** 预览数据 */
  readonly previewData = computed(() => {
    const draft = this.draftState();
    return {
      ...draft.basicInfo,
      items: draft.expenseItems,
      advanceAmount: draft.summary.advanceAmount,
    };
  });

  /** 是否可以提交 */
  readonly canSubmit = computed(() => {
    return this.basicInfoValidState() && this.draftState().expenseItems.length > 0;
  });

  /** 是否可以保存草稿 */
  readonly canSaveDraft = computed(() => {
    const draft = this.draftState();
    const basicInfo = draft.basicInfo;
    const hasBasicInfo =
      !!basicInfo.departmentName?.trim() ||
      !!basicInfo.applicantName?.trim() ||
      !!basicInfo.titleName?.trim() ||
      !!basicInfo.fillDate ||
      !!basicInfo.reason?.trim() ||
      !!basicInfo.travelStartDate ||
      !!basicInfo.travelStartHalf ||
      !!basicInfo.travelEndDate ||
      !!basicInfo.travelEndHalf ||
      (basicInfo.travelDays ?? 0) > 0 ||
      (basicInfo.receiptCount ?? 0) > 0;

    const hasExpenseItems = draft.expenseItems.length > 0;
    const hasAttachments = draft.summary.attachments.length > 0;
    const hasAdvanceAmount = (draft.summary.advanceAmount ?? 0) > 0;

    return hasBasicInfo || hasExpenseItems || hasAttachments || hasAdvanceAmount;
  });

  // =========================
  // Actions
  // =========================

  /**
   * 更新基础信息
   */
  updateBasicInfo(basicInfo: CreateReimbursementClaimInput): void {
    this.draftState.update((draft) => ({
      ...draft,
      basicInfo,
    }));
  }

  /**
   * 更新行程明细
   */
  updateExpenseItems(items: ReimbursementItemInput[]): void {
    this.draftState.update((draft) => ({
      ...draft,
      expenseItems: items,
    }));
    // 更新总金额
    const totalAmount = this.calculateTotalAmount(items);
    this.updateSummaryTotal(totalAmount);
  }

  /**
   * 更新基础信息有效性
   */
  updateBasicInfoValid(valid: boolean): void {
    this.basicInfoValidState.set(valid);
  }

  /**
   * 更新汇总数据
   */
  updateSummary(summary: ExpenseSummary): void {
    this.draftState.update((draft) => ({
      ...draft,
      summary,
    }));
  }

  /**
   * 更新预支金额
   */
  updateAdvanceAmount(amount: number): void {
    const currentSummary = this.draftState().summary;
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        advanceAmount: amount,
        differenceAmount: currentSummary.totalAmount - amount,
      },
    }));
  }

  /**
   * 设置编辑模式的数据（从详情接口转换）
   */
  setEditData(claimId: string, detail: ReimbursementClaimDetail): void {
    // 将 ReimbursementItemEntity 转换为 ReimbursementItemInput
    const expenseItems: ReimbursementItemInput[] = (detail.items || []).map(
      (item: ReimbursementItemEntity) => ({
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
      })
    );

    // 构建基础信息
    const basicInfo: CreateReimbursementClaimInput = {
      claimType: detail.claimType,
      departmentId: detail.departmentId,
      departmentName: detail.departmentName,
      applicantName: detail.applicantName,
      titleName: detail.applicantTitleName,
      reason: detail.reason,
      fillDate: detail.fillDate,
      advanceAmount: detail.advanceAmount,
      travelStartDate: (detail as any).travelStartDate,
      travelStartHalf: (detail as any).travelStartHalf,
      travelEndDate: (detail as any).travelEndDate,
      travelEndHalf: (detail as any).travelEndHalf,
      travelDays: (detail as any).travelDays,
      receiptCount: (detail as any).receiptCount,
      items: expenseItems,
    };

    // 构建汇总信息
    const summary: ExpenseSummary = {
      totalAmount: detail.totalAmount,
      advanceAmount: detail.advanceAmount,
      differenceAmount: detail.balanceAmount,
      attachments: detail.attachments,
    };
    // 构建审批流预览
    const approvalPreview: ReimbursementApprovalPreview = detail.approvalPreview || {};

    this.draftState.set({
      basicInfo,
      expenseItems,
      summary,
      approvalPreview,
      status: detail.status === 'draft' ? 'draft' : 'submitted',
    });

    this.currentClaimIdState.set(claimId);
    this.basicInfoValidState.set(true);
  }

  /**
   * 加载详情数据
   */
  loadDetail(claimId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.set(true);

      this.reimbursementApi.getClaimById(claimId).subscribe({
        next: (detail: ReimbursementClaimDetail) => {
          console.log('detail', detail);
          this.setEditData(claimId, detail);
          this.loadingState.set(false);
          resolve();
        },
        error: (error) => {
          console.error('详情加载失败:', error);
          this.message.error('详情加载失败');
          this.loadingState.set(false);
          reject(error);
        },
      });
    });
  }

  /**
   * 保存草稿 - 调用 createClaim API
   */
  saveDraft(): Promise<boolean> {
    if (!this.canSaveDraft()) {
      this.message.warning('请至少填写一项内容');
      return Promise.resolve(false);
    }

    this.submittingState.set(true);
    const payload = this.buildSubmitPayload();

    return new Promise((resolve) => {
      this.reimbursementApi.createClaim(payload).subscribe({
        next: (result) => {
          this.submittingState.set(false);
          // 保存成功后更新 currentClaimId
          this.currentClaimIdState.set(result.id);
          this.message.success('草稿保存成功');
          resolve(true);
        },
        error: (error) => {
          this.submittingState.set(false);
          this.message.error(error.message || '保存失败，请重试');
          resolve(false);
        },
      });
    });
  }

  /**
   * 提交审批 - 完整流程：先创建报销单，再提交审批
   * 带防重复提交保护
   */
  private isSubmitting = false;

  submitApproval(): Promise<boolean> {
    if (!this.canSubmit()) {
      this.message.warning('请填写完整的报销信息');
      return Promise.resolve(false);
    }

    // 防止重复提交
    if (this.isSubmitting) {
      this.message.warning('正在提交中，请勿重复操作');
      return Promise.resolve(false);
    }

    this.isSubmitting = true;
    this.submittingState.set(true);
    const payload = this.buildSubmitPayload();

    return new Promise((resolve) => {
      // 第一步：创建报销单
      this.reimbursementApi.createClaim(payload).subscribe({
        next: (createResult) => {
          console.log(createResult, 'createResult');
          const claimId = createResult.id;

          // 保存 claimId 到状态
          this.currentClaimIdState.set(claimId);

          // 第二步：提交审批
          this.reimbursementApi.submitClaim(claimId).subscribe({
            next: () => {
              this.isSubmitting = false;
              this.submittingState.set(false);
              this.draftState.update((draft) => ({ ...draft, status: 'submitted' }));
              this.message.success('提交审批成功');
              resolve(true);
            },
            error: (submitError) => {
              this.isSubmitting = false;
              this.submittingState.set(false);
              // 创建成功但提交失败，提示用户可稍后提交
              this.message.error(submitError.message || '创建成功，但提交审批失败，请稍后重试');
              resolve(false);
            },
          });
        },
        error: (createError) => {
          this.isSubmitting = false;
          this.submittingState.set(false);
          this.message.error(createError.message || '创建报销单失败，请重试');
          resolve(false);
        },
      });
    });
  }

  /**
   * 重置表单
   */
  resetForm(): void {
    this.draftState.set({ ...DEFAULT_DRAFT });
    this.basicInfoValidState.set(false);
    this.currentClaimIdState.set(null);
    this.message.info('表单已重置');
  }

  /**
   * 返回上一页
   */
  goBack(): void {
    window.history.back();
  }

  // =========================
  // Private Methods
  // =========================

  private calculateTotalAmount(items: ReimbursementItemInput[]): number {
    return items.reduce((total, item) => total + (item.amount || 0), 0);
  }

  private updateSummaryTotal(totalAmount: number): void {
    const currentSummary = this.draftState().summary;
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        totalAmount: totalAmount,
        differenceAmount: (currentSummary.advanceAmount ?? 0) - totalAmount,
      },
    }));
  }
  updateAttachments(attachments: any[]): void {
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...draft.summary,
        attachments: attachments,
      },
    }));
  }
  private buildSubmitPayload(): CreateReimbursementClaimInput {
    const draft = this.draftState();
    const basicInfo = draft.basicInfo;
    // 转换附件格式，确保包含必要的字段
    const attachments: any = (draft.summary.attachments || []).map((att) => ({
      uploadId: att.uploadId || att.id, // 使用 uploadId 或 id
      category: att.category || 'other',
    }));

    return {
      claimType: basicInfo.claimType,
      departmentId: basicInfo.departmentId,
      reason: basicInfo.reason,
      fillDate: basicInfo.fillDate,
      travelStartDate: basicInfo.travelStartDate,
      travelStartHalf: basicInfo.travelStartHalf,
      travelEndDate: basicInfo.travelEndDate,
      travelEndHalf: basicInfo.travelEndHalf,
      travelDays: basicInfo.travelDays,
      receiptCount: basicInfo.receiptCount,
      advanceAmount: draft.summary.advanceAmount,
      attachments: attachments, // 使用转换后的附件格式
      items: draft.expenseItems.map((item, index) => ({
        ...item,
        sort: index + 1,
      })),
    };
  }
}
