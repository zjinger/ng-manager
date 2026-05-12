import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PageHeaderComponent } from '@app/shared/ui';
import {
  ExpenseBasicInfoComponent,
  ExpenseBillPreviewComponent,
  ExpenseDetailItemComponent,
} from '../../components';
import { ExpenseSummaryAttachmentComponent } from '@app/features/travel-expense/components/expense-summary-attachment/expense-summary-attachment.component';
import { ApprovalFlowComponent } from '@app/features/travel-expense/components/approval-flow/approval-flow.component';
import { ExpenseBasicInfo, ExpenseCollect, ExpenseDetailItem } from '../../models';
import { ExpenseSummary } from '@app/features/travel-expense/models';
import { ExpenseMockDetailData } from '../../models/detail';

// ==================== 类型 ====================

type ExpenseDraft = {
  basicInfo: ExpenseBasicInfo;
  expenseItems: ExpenseDetailItem[];
  summary: ExpenseSummary;
  status: 'draft' | 'submitted';
};

// ==================== 默认值 ====================

const DEFAULT_BASIC_INFO: ExpenseBasicInfo = {
  department: '',
  expensePerson: '',
  reportDate: '',
  receiptCount: null,
  remark: '',
};

const DEFAULT_SUMMARY: ExpenseSummary = {
  totalAmount: 0,
  advanceAmount: 0,
  differenceAmount: 0,
  attachments: [],
};

const DEFAULT_DRAFT: ExpenseDraft = {
  basicInfo: structuredClone(DEFAULT_BASIC_INFO),
  expenseItems: [],
  summary: structuredClone(DEFAULT_SUMMARY),
  status: 'draft',
};

@Component({
  selector: 'app-add-expense',
  standalone: true,

  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    PageHeaderComponent,
    ExpenseBasicInfoComponent,
    ExpenseDetailItemComponent,
    ExpenseSummaryAttachmentComponent,
    ExpenseBillPreviewComponent,
    ApprovalFlowComponent,
  ],
  templateUrl: './add-expense.html',
  styleUrls: ['./add-expense.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpense {
  // ==================== 注入 ====================
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  // ==================== 路由参数 ====================
  readonly expenseId = this.route.snapshot.paramMap.get('id');
  // ==================== 页面状态 ====================
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly basicInfoValid = signal(false);
  readonly draft = signal<ExpenseDraft>(structuredClone(DEFAULT_DRAFT));
  // ==================== 页面模式 ====================
  readonly isEditMode = computed(() => {
    return Boolean(this.expenseId);
  });
  // ==================== vm ====================
  readonly vm = computed(() => {
    const draft = this.draft();
    return {
      basicInfo: draft.basicInfo,
      expenseItems: draft.expenseItems,
      summary: draft.summary,
    };
  });

  // ==================== 计算属性 ====================

  /**
   * 是否有有效费用项
   */
  readonly hasValidExpenseItems = computed(() => {
    return this.draft().expenseItems.some((item) => {
      return Boolean(item.purpose?.trim() && item.amount && item.amount > 0);
    });
  });

  /**
   * 是否有基础信息内容
   */
  readonly hasBasicInfoContent = computed(() => {
    const info = this.draft().basicInfo;

    return Boolean(
      info.department ||
        info.expensePerson?.trim() ||
        info.reportDate ||
        (info.receiptCount ?? 0) > 0 ||
        info.remark?.trim()
    );
  });

  /**
   * 是否有费用内容
   */
  readonly hasExpenseItemsContent = computed(() => {
    return this.draft().expenseItems.some((item) => {
      return Boolean(item.purpose?.trim() || (item.amount && item.amount > 0));
    });
  });

  /**
   * 是否有附件
   */
  readonly hasAttachments = computed(() => {
    return this.draft().summary.attachments.length > 0;
  });

  /**
   * 是否有预支金额
   */
  readonly hasAdvanceAmount = computed(() => {
    return (this.draft().summary.advanceAmount ?? 0) > 0;
  });

  /**
   * 是否允许提交
   */
  readonly canSubmit = computed(() => {
    return this.basicInfoValid() && this.hasValidExpenseItems();
  });

  /**
   * 是否允许保存草稿
   */
  readonly canSaveDraft = computed(() => {
    return (
      this.hasBasicInfoContent() ||
      this.hasExpenseItemsContent() ||
      this.hasAttachments() ||
      this.hasAdvanceAmount()
    );
  });

  /**
   * 总金额
   */
  readonly totalAmount = computed(() => {
    return this.draft().expenseItems.reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);
  });

  // ==================== 生命周期 ====================

  constructor() {
    this.initPage();
  }

  // ==================== 初始化 ====================

  private initPage(): void {
    if (this.isEditMode()) {
      this.loadEditData();
      return;
    }

    this.resetForm(false);
  }

  // ==================== 编辑数据 ====================

  private loadEditData(): void {
    try {
      this.loading.set(true);

      // TODO:
      // const detail = await api.getDetail(this.expenseId)

      const detail = ExpenseMockDetailData;

      const draft = this.expenseDetailToDraft(detail);

      this.draft.set(draft);

      this.basicInfoValid.set(true);
    } catch (error) {
      console.error(error);

      this.message.error('加载报销详情失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 详情转草稿
   */
  private expenseDetailToDraft(detail: ExpenseCollect): ExpenseDraft {
    return {
      basicInfo: structuredClone(detail.basicInfo),

      expenseItems: structuredClone(detail.expenseItems ?? []),

      summary: structuredClone(detail.summary),

      status: 'draft',
    };
  }

  // ==================== 事件 ====================

  onBasicInfoChange(basicInfo: ExpenseBasicInfo): void {
    this.draft.update((draft) => ({
      ...draft,
      basicInfo,
    }));
  }

  onBasicInfoValidChange(valid: boolean): void {
    this.basicInfoValid.set(valid);
  }

  onExpenseItemsChange(expenseItems: ExpenseDetailItem[]): void {
    this.draft.update((draft) => {
      const totalAmount = expenseItems.reduce((sum, item) => {
        return sum + (item.amount || 0);
      }, 0);

      return {
        ...draft,

        expenseItems,

        summary: {
          ...draft.summary,

          totalAmount,

          differenceAmount: (draft.summary.advanceAmount ?? 0) - totalAmount,
        },
      };
    });
  }

  onSummaryChange(summary: ExpenseSummary): void {
    this.draft.update((draft) => ({
      ...draft,
      summary,
    }));
  }

  onAdvanceAmountChange(amount: number): void {
    this.draft.update((draft) => ({
      ...draft,
      summary: {
        ...draft.summary,
        advanceAmount: amount,
        differenceAmount: amount - this.totalAmount(),
      },
    }));
  }

  // ==================== 操作 ====================

  saveDraft(): void {
    if (!this.canSaveDraft()) {
      this.message.warning('请至少填写一项内容');
      return;
    }

    this.draft.update((draft) => ({
      ...draft,
      status: 'draft',
    }));
    console.log('保存草稿:', this.draft());
    this.message.success('草稿保存成功');
  }

  exportForm(): void {
    console.log('导出报销单:', this.draft());
    this.message.info('导出功能开发中');
  }

  submitApproval(): void {
    if (!this.canSubmit()) {
      const missingFields: string[] = [];
      if (!this.basicInfoValid()) {
        missingFields.push('基础信息');
      }
      if (!this.hasValidExpenseItems()) {
        missingFields.push('有效的费用明细');
      }
      this.message.warning(`请填写完整的报销信息：${missingFields.join('、')}`);
      return;
    }

    this.submitting.set(true);
    setTimeout(() => {
      this.draft.update((draft) => ({
        ...draft,
        status: 'submitted',
      }));
      console.log('提交审批:', this.draft());
      this.message.success('提交审批成功');
      this.submitting.set(false);
    }, 1000);
  }

  resetForm(showMessage = true): void {
    this.draft.set(structuredClone(DEFAULT_DRAFT));
    this.basicInfoValid.set(false);
    if (showMessage) {
      this.message.info('表单已重置');
    }
  }

  goBack(): void {
    window.history.back();
  }
}
