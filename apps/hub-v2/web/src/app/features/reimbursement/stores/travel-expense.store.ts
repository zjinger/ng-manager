import { computed, inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  CreateReimbursementClaimInput,
  ReimbursementApprovalPreview,
  ReimbursementApprovalPreviewInput,
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementClaimStatus,
  ReimbursementItemEntity,
  ReimbursementItemInput,
  ReimbursementLogEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import type { ExpenseSummary } from '@app/features/reimbursement/shared/models/expense-summary.model';
import {
  filterValidItems,
  isPositiveMoney,
  roundMoney,
  sumMoney,
} from '@app/features/reimbursement/shared/utils/reimbursement-money.util';

export interface TravelExpenseDraft {
  basicInfo: CreateReimbursementClaimInput;
  expenseItems: ReimbursementItemInput[];
  summary: ExpenseSummary;
  approvalPreview?: ReimbursementApprovalPreview;
  logs: ReimbursementLogEntity[];
  status: ReimbursementClaimStatus;
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
    travelStartHalf: 'am',
    travelEndDate: null,
    travelEndHalf: 'am',
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
  approvalPreview: {} as ReimbursementApprovalPreview,
  logs: [],
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

  /** 防重复提交标志 */
  private isSubmitting = false;

  /** 审批预览请求序号，防止旧请求覆盖新表单状态 */
  private approvalPreviewRequestSeq = 0;

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
    return sumMoney(items.map((item) => item.amount));
  });

  /** 预支金额 */
  readonly advanceAmount = computed(() => this.draftState().summary.advanceAmount);

  /** 差额 */
  readonly differenceAmount = computed(() => {
    const summary = this.draftState().summary;
    return roundMoney(summary.advanceAmount - summary.totalAmount);
  });

  /** 预览数据 */
  readonly previewData = computed(() => {
    const draft = this.draftState();
    return {
      ...draft.basicInfo,
      items: draft.expenseItems,
      advanceAmount: draft.summary.advanceAmount,
      totalAmount: draft.summary.totalAmount,
      differenceAmount: draft.summary.differenceAmount,
    };
  });

  /** 是否可以提交 */
  readonly canSubmit = computed(() => {
    return this.basicInfoValidState() && filterValidItems(this.draftState().expenseItems).length > 0;
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

    const hasExpenseItems = filterValidItems(draft.expenseItems).length > 0;
    const hasAttachments = draft.summary.attachments.length > 0;
    const hasAdvanceAmount = isPositiveMoney(draft.summary.advanceAmount);

    return hasBasicInfo || hasExpenseItems || hasAttachments || hasAdvanceAmount;
  });

  /** 是否有未保存的更改 */
  readonly hasUnsavedChanges = computed(() => {
    if (this.isEditMode()) {
      return true; // 编辑模式下总是认为有更改，由组件控制保存逻辑
    }
    return JSON.stringify(this.draftState()) !== JSON.stringify(DEFAULT_DRAFT);
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
    void this.refreshApprovalPreview();
  }

  /**
   * 更新行程明细
   */
  updateExpenseItems(items: ReimbursementItemInput[]): void {
    const validItems = filterValidItems(items);
    this.draftState.update((draft) => ({
      ...draft,
      expenseItems: validItems,
    }));
    // 更新总金额
    const totalAmount = this.calculateTotalAmount(validItems);
    this.updateSummaryTotal(totalAmount);
    void this.refreshApprovalPreview();
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
    const totalAmount = roundMoney(summary.totalAmount);
    const advanceAmount = roundMoney(summary.advanceAmount);
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...summary,
        totalAmount,
        advanceAmount,
        differenceAmount: roundMoney(advanceAmount - totalAmount),
      },
    }));
  }

  /**
   * 更新预支金额
   */
  updateAdvanceAmount(amount: number): void {
    const currentSummary = this.draftState().summary;
    const normalizedAmount = roundMoney(amount);
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        advanceAmount: normalizedAmount,
        differenceAmount: roundMoney(normalizedAmount - currentSummary.totalAmount),
      },
    }));
    void this.refreshApprovalPreview();
  }

  /**
   * 更新附件
   */
  updateAttachments(attachments: ReimbursementAttachmentEntity[]): void {
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...draft.summary,
        attachments: attachments,
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
      travelStartDate: detail.travelStartDate,
      travelStartHalf: detail.travelStartHalf,
      travelEndDate: detail.travelEndDate,
      travelEndHalf: detail.travelEndHalf,
      travelDays: detail.travelDays,
      receiptCount: detail.receiptCount,
      items: expenseItems,
    };

    // 构建汇总信息
    const summary: ExpenseSummary = {
      totalAmount: detail.totalAmount,
      advanceAmount: detail.advanceAmount,
      differenceAmount: roundMoney(detail.advanceAmount - detail.totalAmount),
      attachments: detail.attachments,
    };

    this.draftState.set({
      basicInfo,
      expenseItems,
      summary,
      approvalPreview: detail.approvalPreview,
      logs: detail.logs ?? [],
      status: detail.status,
    });

    this.currentClaimIdState.set(claimId);
    this.basicInfoValidState.set(true);
  }

  /**
   * 加载详情数据
   */
  async loadDetail(claimId: string): Promise<void> {
    try {
      this.loadingState.set(true);
      const detail = await lastValueFrom(this.reimbursementApi.getClaimById(claimId));
      this.setEditData(claimId, detail);
    } catch (error) {
      console.error('详情加载失败:', error);
      this.message.error('详情加载失败');
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  /**
   * 保存草稿 - 自动判断新建或编辑
   */
  async saveDraft(): Promise<boolean> {
    if (!this.canSaveDraft()) {
      this.message.warning('请至少填写一项内容');
      return false;
    }

    if (this.isSubmitting) {
      this.message.warning('正在保存中，请勿重复操作');
      return false;
    }

    this.isSubmitting = true;
    this.submittingState.set(true);

    try {
      const payload = this.buildSubmitPayload();
      
      if (this.isEditMode()) {
        // 编辑模式：更新报销单
        const claimId = this.currentClaimIdState()!;
        const result = await lastValueFrom(this.reimbursementApi.updateClaim(claimId, payload));
        this.message.success('报销单更新成功');
        return true;
      } else {
        // 新建模式：创建报销单
        const result = await lastValueFrom(this.reimbursementApi.createClaim(payload));
        this.currentClaimIdState.set(result.id);
        this.message.success('草稿保存成功');
        return true;
      }
    } catch (error: any) {
      this.message.error(error.message || '保存失败，请重试');
      return false;
    } finally {
      this.isSubmitting = false;
      this.submittingState.set(false);
    }
  }

  /**
   * 提交审批 - 自动判断新建或编辑
   */
  async submitApproval(comment?: string | null): Promise<boolean> {
    if (!this.canSubmit()) {
      this.message.warning('请填写完整的报销信息');
      return false;
    }

    if (this.isSubmitting) {
      this.message.warning('正在提交中，请勿重复操作');
      return false;
    }

    this.isSubmitting = true;
    this.submittingState.set(true);

    try {
      const payload = this.buildSubmitPayload();
      let claimId: string;

      if (this.isEditMode()) {
        // 编辑模式：先更新报销单
        claimId = this.currentClaimIdState()!;
        await lastValueFrom(this.reimbursementApi.updateClaim(claimId, payload));
      } else {
        // 新建模式：创建报销单
        const createResult = await lastValueFrom(this.reimbursementApi.createClaim(payload));
        claimId = createResult.id;
        this.currentClaimIdState.set(claimId);
      }

      // 提交审批
      await lastValueFrom(this.reimbursementApi.submitClaim(claimId, {
        comment: comment?.trim() || null,
      }));

      this.draftState.update((draft) => ({ ...draft, status: 'submitted' }));
      return true;
    } catch (error: any) {
      this.message.error(error.message || '提交审批失败，请重试');
      return false;
    } finally {
      this.isSubmitting = false;
      this.submittingState.set(false);
    }
  }

  /**
   * 仅更新报销单（不提交）
   */
  async updateClaimOnly(): Promise<boolean> {
    const claimId = this.currentClaimIdState();

    if (!claimId) {
      this.message.error('未找到要编辑的报销单');
      return false;
    }

    if (!this.canSubmit()) {
      this.message.warning('请填写完整的报销信息');
      return false;
    }

    if (this.isSubmitting) {
      this.message.warning('正在保存中，请勿重复操作');
      return false;
    }

    this.isSubmitting = true;
    this.submittingState.set(true);

    try {
      const payload = this.buildSubmitPayload();
      await lastValueFrom(this.reimbursementApi.updateClaim(claimId, payload));
      this.message.success('报销单更新成功');
      return true;
    } catch (error: any) {
      this.message.error(error.message || '更新失败，请重试');
      return false;
    } finally {
      this.isSubmitting = false;
      this.submittingState.set(false);
    }
  }

  /**
   * 重置表单
   */
  resetForm(claimType: CreateReimbursementClaimInput['claimType'] = 'travel'): void {
    this.draftState.set({
      ...DEFAULT_DRAFT,
      basicInfo: {
        ...DEFAULT_DRAFT.basicInfo,
        claimType,
      },
    });
    this.basicInfoValidState.set(false);
    this.currentClaimIdState.set(null);
    this.isSubmitting = false;
    // this.message.info('表单已重置');
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

  /**
   * 计算总金额
   */
  private calculateTotalAmount(items: ReimbursementItemInput[]): number {
    return sumMoney(items.map((item) => item.amount));
  }

  /**
   * 更新汇总总金额
   */
  private updateSummaryTotal(totalAmount: number): void {
    const currentSummary = this.draftState().summary;
    const normalizedTotal = roundMoney(totalAmount);
    this.draftState.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        totalAmount: normalizedTotal,
        differenceAmount: roundMoney(currentSummary.advanceAmount - normalizedTotal),
      },
    }));
  }

  /**
   * 构建提交数据
   */
  private buildSubmitPayload(): CreateReimbursementClaimInput {
    const draft = this.draftState();
    const basicInfo = draft.basicInfo;

    // 过滤无效的 expenseItems
    const validExpenseItems = filterValidItems(draft.expenseItems);
    
    // 转换附件格式
    const attachments:any = (draft.summary.attachments || [])
      .filter((att) => att.uploadId || att.id)
      .map((att) => ({
        uploadId: att.uploadId || att.id,
        category: att.category || 'other',
      }));

    return {
      claimType: basicInfo.claimType,
      departmentId: this.optionalString(basicInfo.departmentId),
      reason: basicInfo.reason,
      fillDate: basicInfo.fillDate,
      travelStartDate: basicInfo.travelStartDate,
      travelStartHalf: basicInfo.travelStartHalf,
      travelEndDate: basicInfo.travelEndDate,
      travelEndHalf: basicInfo.travelEndHalf,
      travelDays: basicInfo.travelDays,
      receiptCount: basicInfo.receiptCount,
      advanceAmount: draft.summary.advanceAmount,
      attachments: attachments,
      items: validExpenseItems.map((item, index) => ({
        ...item,
        sort: index + 1,
      })),
    };
  }

  private async refreshApprovalPreview(): Promise<void> {
    if (this.isEditMode()) {
      return;
    }
    const draft = this.draftState();
    const requestSeq = ++this.approvalPreviewRequestSeq;
    try {
      const preview = await lastValueFrom(this.reimbursementApi.previewApproval(this.buildPreviewPayload(draft)));
      if (requestSeq !== this.approvalPreviewRequestSeq) {
        return;
      }
      this.draftState.update((current) => ({
        ...current,
        approvalPreview: preview,
      }));
    } catch {
      if (requestSeq !== this.approvalPreviewRequestSeq) {
        return;
      }
      this.draftState.update((current) => ({
        ...current,
        approvalPreview: { nodes: [] },
      }));
    }
  }

  private buildPreviewPayload(draft: TravelExpenseDraft): ReimbursementApprovalPreviewInput {
    const basicInfo = draft.basicInfo;
    return {
      claimType: basicInfo.claimType,
      departmentId: this.optionalString(basicInfo.departmentId),
      reason: basicInfo.reason,
      fillDate: basicInfo.fillDate,
      travelStartDate: basicInfo.travelStartDate,
      travelStartHalf: basicInfo.travelStartHalf,
      travelEndDate: basicInfo.travelEndDate,
      travelEndHalf: basicInfo.travelEndHalf,
      travelDays: basicInfo.travelDays,
      receiptCount: basicInfo.receiptCount,
      advanceAmount: draft.summary.advanceAmount,
      items: filterValidItems(draft.expenseItems),
    };
  }

  private optionalString(value: string | null | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }
}
