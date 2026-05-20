import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { PageHeaderComponent } from '@app/shared/ui';
import {
  ExpenseBasicInfoComponent,
  ExpenseDetailItemComponent,
} from '../../components';
import { ApprovalFlowComponent } from '@app/features/reimbursement/travel-expense/components/approval-flow/approval-flow.component';
import { ExpenseSummaryAttachmentComponent } from '@app/features/reimbursement/travel-expense/components/expense-summary-attachment/expense-summary-attachment.component';
import { ExSaveDialogComponent } from '../../dialogs/ex-save-dialog/ex-save-dialog.component';
// import { ExpenseStore } from '../../stores/expense.store'; // 需要创建这个 Store
import { TravelExpenseStore } from '@app/features/reimbursement/stores/travel-expense.store';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    FormsModule,
    ExpenseBasicInfoComponent,
    ExpenseDetailItemComponent,
    ExpenseSummaryAttachmentComponent,
    ApprovalFlowComponent,
    ExSaveDialogComponent,
  ],
  templateUrl: './add-expense.html',
  styleUrls: ['./add-expense.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TravelExpenseStore], // 提供 Store
})
export class AddExpense implements OnInit {
  private readonly store = inject(TravelExpenseStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalService = inject(NzModalService);

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
  readonly isEditMode = this.store.isEditMode;
  readonly currentClaimId = this.store.currentClaimId;

  ngOnInit(): void {
    this.initPage();
  }

  private async initPage(): Promise<void> {
    if (this.expenseId) {
      // 编辑模式：加载详情
      await this.store.loadDetail(this.expenseId);
    } else {
      // 新建模式：重置表单
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

  // 费用明细变化
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

  // 附件变化
  onAttachmentsChange(attachments: any[]): void {
    this.store.updateAttachments(attachments);
  }

  // 保存草稿
  async saveDraft(): Promise<void> {
    const success = await this.store.saveDraft();
    if (success) {
      this.modalService.success({
        nzTitle: '保存成功',
        nzContent: this.isEditMode() ? '草稿更新成功' : '草稿保存成功',
        nzOkText: '确定',
        nzKeyboard: false,
        nzMaskClosable: false,
        nzClosable: false,
        nzOnOk: () => {
          this.router.navigate(['/my-expenses']);
        },
        nzCancelText: '继续编辑',
        nzOnCancel: () => {
          // 留在当前页面继续编辑
        },
      });
    }
  }

  // 打开预览弹窗
  openPreviewDialog(): void {
    if (!this.canSubmit()) {
      this.modalService.warning({
        nzTitle: '提示',
        nzContent: '请填写完整的报销信息后再提交',
        nzOkText: '知道了',
      });
      return;
    }
    this.previewDialogOpen.set(true);
  }

  // 确认提交
  async confirmSubmit(action: string): Promise<void> {
    this.previewDialogOpen.set(false);

    if (action === 'submit') {
      const success = await this.store.submitApproval();
      if (success) {
        this.modalService.success({
          nzTitle: '提交成功',
          nzContent: this.isEditMode() ? '报销单更新并提交成功' : '报销单提交成功',
          nzOkText: '确定',
          nzKeyboard: false,
          nzMaskClosable: false,
          nzClosable: false,
          nzOnOk: () => {
            this.router.navigate(['/my-expenses']);
          }
        });
      }
    } else if (action === 'draft') {
      await this.saveDraft();
    }
  }

  // 关闭预览弹窗
  closePreviewDialog(): void {
    this.previewDialogOpen.set(false);
  }

  // 返回上一页
  goBack(): void {
    if (this.store.hasUnsavedChanges() && this.store.canSaveDraft()) {
      this.modalService.confirm({
        nzTitle: '提示',
        nzContent: '您有未保存的更改，确定要离开吗？',
        nzOkText: '离开',
        nzCancelText: '取消',
        nzOnOk: () => {
          this.store.goBack();
        },
      });
    } else {
      this.store.goBack();
    }
  }

  // 导出报销单
  exportForm(): void {
    if (!this.isEditMode()) {
      this.modalService.info({
        nzTitle: '提示',
        nzContent: '请先保存报销单后再导出',
        nzOkText: '知道了',
      });
      return;
    }
    // TODO: 调用导出接口
    console.log('导出报销单:', this.draft());
  }

  // 获取页面标题
  getPageTitle(): string {
    if (this.loading()) {
      return '加载中...';
    }
    if (this.isEditMode()) {
      return this.draft().status === 'submitted' ? '查看费用报销' : '编辑费用报销';
    }
    return '新建费用报销';
  }

  // 获取按钮文本
  getSubmitButtonText(): string {
    if (this.isEditMode()) {
      return this.draft().status === 'submitted' ? '重新提交' : '提交审批';
    }
    return '提交审批';
  }
}