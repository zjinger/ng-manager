import { inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

export type ApprovalAction = 'pass' | 'reject' | 'transfer' | 'addSign';

export interface ApprovalActionResult<T = any> {
  type: ApprovalAction;
  opinion: string;
  detail?: T;
}

@Injectable()
export class ApprovalActionService {
  private messageService = inject(NzMessageService);

  // 弹窗显示状态
  readonly showTransferDialog = signal(false);
  readonly showCountersignDialog = signal(false);
  readonly showPassDialog = signal(false);
  readonly showRejectDialog = signal(false);

  // 提交状态
  readonly isTransferring = signal(false);
  readonly isCountersigning = signal(false);
  readonly isPassing = signal(false);
  readonly isRejecting = signal(false);

  // 审批意见
  private comment = '';

  setComment(comment: string): void {
    this.comment = comment;
  }

  getComment(): string {
    return this.comment;
  }

  resetComment(): void {
    this.comment = '';
  }

  // 检查是否有审批预览数据
  checkApprovalPreview(hasData: boolean): boolean {
    if (!hasData) {
      this.messageService.warning('请先保存并提交报销单');
      return false;
    }
    return true;
  }

  // 打开弹窗
  openPassDialog(): void {
    this.showPassDialog.set(true);
  }

  openRejectDialog(): void {
    this.showRejectDialog.set(true);
  }

  openTransferDialog(): void {
    this.showTransferDialog.set(true);
  }

  openCountersignDialog(): void {
    this.showCountersignDialog.set(true);
  }

  // 关闭弹窗
  closeTransferDialog(): void {
    this.showTransferDialog.set(false);
    this.isTransferring.set(false);
  }

  closeCountersignDialog(): void {
    this.showCountersignDialog.set(false);
    this.isCountersigning.set(false);
  }

  closePassDialog(): void {
    this.showPassDialog.set(false);
    this.isPassing.set(false);
    this.resetComment();
  }

  closeRejectDialog(): void {
    this.showRejectDialog.set(false);
    this.isRejecting.set(false);
    this.resetComment();
  }

  // 提交操作（带 loading 模拟）
  async submitWithLoading<T>(
    loadingSignal: ReturnType<typeof signal<boolean>>,
    action: () => ApprovalActionResult<T>
  ): Promise<ApprovalActionResult<T>> {
    loadingSignal.set(true);

    // 模拟异步操作，实际使用时可以移除 setTimeout
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = action();
        loadingSignal.set(false);
        resolve(result);
      }, 500);
    });
  }
}
