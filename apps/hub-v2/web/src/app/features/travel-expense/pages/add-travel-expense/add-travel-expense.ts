import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  TravelExpenseBasicInfo,
  TravelExpenseBasicInfoComponent,
} from '../../components/travel-expense-basicInfo/travel-expense-basicInfo.component';
import {
  ExpenseDetailsComponent,
  TravelExpenseItem,
} from '../../components/expense-details/expense-details.component';
import {
  ExpenseSummary,
  ExpenseSummaryAttachmentComponent,
} from '../../components/expense-summary-attachment/expense-summary-attachment.component';
import { ExpensePreviewComponent } from '../../components/expense-preview/expense-preview.component';
import { ApprovalFlowComponent } from '../../components/approval-flow/approval-flow.component';

// 完整报销单类型
type TravelExpenseDraft = {
  basicInfo: TravelExpenseBasicInfo;
  expenseItems: TravelExpenseItem[];
  summary: ExpenseSummary;
  status: 'draft' | 'submitted';
};

const DEFAULT_DRAFT: TravelExpenseDraft = {
  basicInfo: {
    department: '',
    name: '',
    position: '',
    reportDate: '',
    travelReason: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    receiptCount: null,
    travelDays: null,
  },
  expenseItems: [],
  summary: {
    totalAmount: 0,
    advanceAmount: 0,
    differenceAmount: 0,
    attachments: [],
  },
  status: 'draft',
};

@Component({
  selector: 'app-add-travel-expense',
  standalone: true,
  imports: [
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    FormsModule,
    TravelExpenseBasicInfoComponent,
    ExpenseDetailsComponent,
    ExpenseSummaryAttachmentComponent,
    ExpensePreviewComponent,
    ApprovalFlowComponent
  ],
  templateUrl: './add-travel-expense.html',
  styleUrls: ['./add-travel-expense.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTravelExpense {
  private readonly message = inject(NzMessageService);

  // 完整草稿
  readonly draft = signal<TravelExpenseDraft>({ ...DEFAULT_DRAFT });

  // 基础信息是否有效
  readonly basicInfoValid = signal(false);

  // 表单是否正在提交
  readonly submitting = signal(false);

  // 计算表单是否可以提交（基础信息有效 + 至少有一条行程明细）
  readonly canSubmit = computed(() => {
    return this.basicInfoValid() && this.draft().expenseItems.length > 0;
    // 后续可以加入其他模块的有效性检查
    // && this.tripsValid()
    // && this.expensesValid()
  });

  // 计算表单是否可以保存草稿（只要有内容就可以保存）
  readonly canSaveDraft = computed(() => {
    const draft = this.draft();
    const basicInfo = draft.basicInfo;
    const hasBasicInfo =
      !!basicInfo.department ||
      !!basicInfo.name?.trim() ||
      !!basicInfo.position?.trim() ||
      !!basicInfo.reportDate ||
      !!basicInfo.travelReason?.trim()||
      !!basicInfo.startDate ||
      !!basicInfo.startTime ||
      !!basicInfo.endDate ||
      !!basicInfo.endTime ||
      (basicInfo.travelDays ?? 0) > 0 || 
      (basicInfo.receiptCount ?? 0) > 0;

    const hasExpenseItems = draft.expenseItems.length > 0;
    const hasAttachments = draft.summary.attachments.length > 0;
    const hasAdvanceAmount = (draft.summary.advanceAmount ?? 0) > 0;
    return hasBasicInfo || hasExpenseItems || hasAttachments || hasAdvanceAmount;
  });

  // 处理基础信息变化
  onBasicInfoChange(basicInfo: TravelExpenseBasicInfo): void {
    this.draft.update((draft) => ({
      ...draft,
      basicInfo,
    }));
  }
  // 处理行程明细变化
  onExpenseItemsChange(items: TravelExpenseItem[]): void {
    this.draft.update((draft) => ({
      ...draft,
      expenseItems: items,
    }));
    // 计算总计金额并更新汇总组件
    const totalAmount = this.calculateTotalAmount(items);
    // 需要通过 ViewChild 或信号来更新，这里简单处理
    this.updateSummaryTotal(totalAmount);
  }
  // 计算总计金额
  private calculateTotalAmount(items: TravelExpenseItem[]): number {
    return items.reduce((total, item) => total + (item.subtotal || 0), 0);
  }

  // 处理基础信息有效性变化
  onBasicInfoValidChange(valid: boolean): void {
    this.basicInfoValid.set(valid);
  }
  // 更新汇总组件的总金额
  private updateSummaryTotal(totalAmount: number): void {
    const currentSummary = this.draft().summary;
    this.draft.update((draft) => ({
      ...draft,
      summary: {
        ...currentSummary,
        totalAmount: totalAmount,
        differenceAmount: (currentSummary.advanceAmount ?? 0) - totalAmount,
      },
    }));
  }
  // 汇总数据变化
  onSummaryChange(summary: ExpenseSummary): void {
    this.draft.update((draft) => ({
      ...draft,
      summary,
    }));
  }
  // 预支金额变化
  onAdvanceAmountChange(amount: number): void {
    // 可以在这里做额外处理，比如验证预支金额不能超过总计等
  }
  // 保存草稿
  saveDraft(): void {
    if (!this.canSaveDraft()) {
      this.message.warning('请至少填写一项内容');
      return;
    }

    this.draft.update((draft) => ({ ...draft, status: 'draft' }));
    console.log('保存草稿:', this.draft());
    this.message.success('草稿保存成功');
  }

  // 导出
  exportForm(): void {
    console.log('导出报销单:', this.draft());
    this.message.info('导出功能开发中');
  }

  // 提交审批
  submitApproval(): void {
    if (!this.canSubmit()) {
      this.message.warning('请填写完整的报销信息');
      return;
    }

    this.submitting.set(true);

    // 模拟提交 API 调用
    setTimeout(() => {
      this.draft.update((draft) => ({ ...draft, status: 'submitted' }));
      console.log('提交审批:', this.draft());
      this.message.success('提交审批成功');
      this.submitting.set(false);
    }, 1000);
  }

  // 重置整个表单
  resetForm(): void {
    this.draft.set({ ...DEFAULT_DRAFT });
    this.basicInfoValid.set(false);
    this.message.info('表单已重置');
  }
}
