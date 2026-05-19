import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { TravelExpenseBasicInfoComponent } from '../../components/travel-expense-basicInfo/travel-expense-basicInfo.component';
import { ExpenseDetailsComponent } from '../../components/expense-details/expense-details.component';
import { ExpenseSummaryAttachmentComponent } from '../../components/expense-summary-attachment/expense-summary-attachment.component';
import { ApprovalFlowComponent } from '../../components/approval-flow/approval-flow.component';
import { ActivatedRoute } from '@angular/router';
import { SaveDialogComponent } from '../../dialogs';
import { TravelExpenseStore } from '@app/features/reimbursement/stores/travel-expense.store';


@Component({
  selector: 'app-add-travel-expense',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    FormsModule,
    TravelExpenseBasicInfoComponent,
    ExpenseDetailsComponent,
    ExpenseSummaryAttachmentComponent,
    ApprovalFlowComponent,
    SaveDialogComponent,
  ],
  templateUrl: './add-travel-expense.html',
  styleUrls: ['./add-travel-expense.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TravelExpenseStore],
})
export class AddTravelExpense implements OnInit {
  private readonly store = inject(TravelExpenseStore);
  private readonly route = inject(ActivatedRoute);

  // 路由参数
  public expenseId = this.route.snapshot.paramMap.get('id');

  // 预览弹窗状态
  readonly previewDialogOpen = signal(false);

  // 暴露 store 中的数据给模板
  readonly draft = this.store.draft;
  readonly basicInfoValid = this.store.basicInfoValid;
  readonly submitting = this.store.submitting;
  readonly loading = this.store.loading;
  readonly canSubmit = this.store.canSubmit;
  readonly canSaveDraft = this.store.canSaveDraft;
  readonly previewData = this.store.previewData;
  readonly totalAmount = this.store.totalAmount;

  ngOnInit(): void {
    this.initPage();
  }

  private async initPage(): Promise<void> {
    if (this.expenseId) {
      await this.store.loadDetail(this.expenseId);
    } else {
      this.store.resetForm();
    }
  }

  // 基础信息变化
  onBasicInfoChange(basicInfo: any): void {
    this.store.updateBasicInfo(basicInfo);
  }

  // 基础信息有效性变化
  onBasicInfoValidChange(valid: boolean): void {
    this.store.updateBasicInfoValid(valid);
  }

  // 行程明细变化
  onExpenseItemsChange(items: any[]): void {
    this.store.updateExpenseItems(items);
  }

  // 汇总数据变化
  onSummaryChange(summary: any): void {
    this.store.updateSummary(summary);
  }

  // 预支金额变化
  onAdvanceAmountChange(amount: number): void {
    this.store.updateAdvanceAmount(amount);
  }

  // 保存草稿
  async saveDraft(): Promise<void> {
    await this.store.saveDraft();
  }

  // 打开预览弹窗
  openPreviewDialog(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.previewDialogOpen.set(true);
  }

  // 确认提交
  async confirmSubmit(action: string): Promise<void> {
    this.previewDialogOpen.set(false);
    if (action === 'submit') {
      await this.store.submitApproval();
    } else {
      await this.store.saveDraft();
    }
  }

  // 关闭预览弹窗
  closePreviewDialog(): void {
    this.previewDialogOpen.set(false);
  }
  onAttachmentsChange(attachments: any): void {
    console.log('附件变化:', attachments);
    // 更新 store 中的附件数据
    this.store.updateAttachments(attachments);
  }
  // 返回
  goBack(): void {
    this.store.goBack();
  }

  // 导出（如需使用）
  exportForm(): void {
    console.log('导出报销单:', this.draft());
  }
  handleApprovalAction(event: any) {
    // 调用接口提交审批
    switch (event.type) {
      case 'pass':
        // 调用通过接口
        break;
      case 'reject':
        // 调用驳回接口
        break;
      // ...
    }}
}