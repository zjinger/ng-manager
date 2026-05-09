import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  ExpenseBasicInfo,
  ExpenseBasicInfoComponent,
  ExpenseBillPreviewComponent,
  ExpenseDetailItem,
  ExpenseDetailItemComponent,
} from '../../components';
import {
  ExpenseSummary,
  ExpenseSummaryAttachmentComponent,
} from '@app/features/travel-expense/components/expense-summary-attachment/expense-summary-attachment.component';
import { ApprovalFlowComponent } from '@app/features/travel-expense/components/approval-flow/approval-flow.component';

// 完整报销单类型
type ExpenseDraft = {
  basicInfo: ExpenseBasicInfo;
  expenseItems: ExpenseDetailItem[];
  summary: ExpenseSummary;
  status: 'draft' | 'submitted';
};

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
  basicInfo: DEFAULT_BASIC_INFO,
  expenseItems: [],
  summary: DEFAULT_SUMMARY,
  status: 'draft',
};

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    FormsModule,
    ExpenseBasicInfoComponent,
    ExpenseDetailItemComponent,
    ExpenseSummaryAttachmentComponent,
    ExpenseBillPreviewComponent,
    ApprovalFlowComponent
  ],
  templateUrl: './add-expense.html',
  styleUrls: ['./add-expense.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpense {
  private readonly message = inject(NzMessageService);

  // ==================== 状态 ====================
  readonly draft = signal<ExpenseDraft>({ ...DEFAULT_DRAFT });
  readonly basicInfoValid = signal(false);
  readonly submitting = signal(false);

  // ==================== 计算属性 ====================

  /** 是否有有效的费用明细（有用途且有金额） */
  private readonly hasValidExpenseItems = computed(() => {
    return this.draft().expenseItems.some(
      (item) => item.purpose?.trim() && item.amount && item.amount > 0
    );
  });

  /** 是否有基础信息内容 */
  private readonly hasBasicInfoContent = computed(() => {
    const info = this.draft().basicInfo;
    return (
      !!info.department ||
      !!info.expensePerson?.trim() ||
      !!info.reportDate ||
      (info.receiptCount ?? 0) > 0 ||
      !!info.remark?.trim()
    );
  });

  /** 是否有费用明细内容 */
  private readonly hasExpenseItemsContent = computed(() => {
    return this.draft().expenseItems.some(
      (item) => item.purpose?.trim() || (item.amount && item.amount > 0)
    );
  });

  /** 是否有附件 */
  private readonly hasAttachments = computed(() => {
    return this.draft().summary.attachments.length > 0;
  });

  /** 是否有预支金额 */
  private readonly hasAdvanceAmount = computed(() => {
    return (this.draft().summary.advanceAmount ?? 0) > 0;
  });

  /** 是否可以提交审批 */
  readonly canSubmit = computed(() => {
    return this.basicInfoValid() && this.hasValidExpenseItems();
  });

  /** 是否可以保存草稿 */
  readonly canSaveDraft = computed(() => {
    return (
      this.hasBasicInfoContent() ||
      this.hasExpenseItemsContent() ||
      this.hasAttachments() ||
      this.hasAdvanceAmount()
    );
  });

  /** 计算费用总金额 */
  private readonly totalAmount = computed(() => {
    return this.draft().expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  // ==================== 业务方法 ====================

  /** 更新汇总组件的总金额 */
  private updateSummaryTotal(): void {
    const currentSummary = this.draft().summary;
    this.draft.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        totalAmount: this.totalAmount(),
        differenceAmount: (currentSummary.advanceAmount ?? 0) - this.totalAmount(),
      },
    }));
  }

  // ==================== 事件处理 ====================

  onBasicInfoChange(basicInfo: ExpenseBasicInfo): void {
    this.draft.update((draft) => ({ ...draft, basicInfo }));
  }

  onBasicInfoValidChange(valid: boolean): void {
    this.basicInfoValid.set(valid);
  }

  onExpenseItemsChange(items: ExpenseDetailItem[]): void {
    this.draft.update((draft) => ({ ...draft, expenseItems: items }));
    this.updateSummaryTotal();
  }

  onSummaryChange(summary: ExpenseSummary): void {
    this.draft.update((draft) => ({ ...draft, summary }));
  }

  onAdvanceAmountChange(amount: number): void {
    // 预支金额变化时重新计算差额
    this.updateSummaryTotal();
  }

  // ==================== 操作 ====================

  saveDraft(): void {
    if (!this.canSaveDraft()) {
      this.message.warning('请至少填写一项内容');
      return;
    }

    this.draft.update((draft) => ({ ...draft, status: 'draft' }));
    console.log('保存草稿:', this.draft());
    this.message.success('草稿保存成功');
  }

  exportForm(): void {
    console.log('导出报销单:', this.draft());
    this.message.info('导出功能开发中');
  }

  submitApproval(): void {
    if (!this.canSubmit()) {
      const missingFields = [];
      if (!this.basicInfoValid()) missingFields.push('基础信息');
      if (!this.hasValidExpenseItems()) missingFields.push('有效的费用明细');
      this.message.warning(`请填写完整的报销信息：${missingFields.join('、')}`);
      return;
    }

    this.submitting.set(true);

    // TODO: 调用真实 API
    setTimeout(() => {
      this.draft.update((draft) => ({ ...draft, status: 'submitted' }));
      console.log('提交审批:', this.draft());
      this.message.success('提交审批成功');
      this.submitting.set(false);
    }, 1000);
  }

  resetForm(): void {
    this.draft.set({ ...DEFAULT_DRAFT });
    this.basicInfoValid.set(false);
    this.message.info('表单已重置');
  }
}
