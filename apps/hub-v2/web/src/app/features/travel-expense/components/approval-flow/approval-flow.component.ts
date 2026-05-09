import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApprovalPassDialogComponent,
  ApprovalPassData,
  ApprovalRejectDialogComponent,
  ApprovalRejectData,
  ApprovalTransferDialogComponent,
  TransferData,
  CountersignAffirmDialogComponent,
  CountersignData,
} from '../../dialogs';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface ApprovalStep {
  id: number;
  title: string;
  status?: 'wait' | 'process' | 'finish';
}

export type ApprovalAction = 'pass' | 'reject' | 'transfer' | 'addSign';

@Component({
  selector: 'app-approval-flow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ApprovalTransferDialogComponent,
    CountersignAffirmDialogComponent,
    ApprovalPassDialogComponent,
    ApprovalRejectDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="approval-wrapper">
      <!-- 流程 -->
      <div class="approval-flow">
        @for (step of displaySteps(); track step.id; let last = $last) {
        <div class="flow-item">
          <!-- 左侧 -->
          <div class="flow-left">
            <div
              class="flow-circle"
              [class.wait]="step.status === 'wait'"
              [class.process]="step.status === 'process'"
              [class.finish]="step.status === 'finish'"
            >
              {{ step.id }}
            </div>

            @if (!last) {
            <div class="flow-line" [class.active]="step.status === 'finish'"></div>
            }
          </div>

          <!-- 右侧 -->
          <div class="flow-content">
            <div class="flow-title">
              {{ step.title }}
            </div>

            <div
              class="flow-desc"
              [class.process-text]="step.status === 'process'"
              [class.finish-text]="step.status === 'finish'"
            >
              {{ step.desc }}
            </div>
          </div>
        </div>
        }
      </div>

      <!-- 审批意见 -->
      <div class="approval-panel">
        <div class="panel-title">审批意见</div>

        <textarea
          class="approval-textarea"
          [(ngModel)]="opinion"
          placeholder="请输入审批意见，例如：票据完整，同意报销"
        ></textarea>

        <!-- 第一行 -->
        <div class="action-row action-row--primary">
          <button class="action-btn pass" (click)="onPass()">✓ 通过</button>
          <button class="action-btn reject" (click)="onReject()">✕ 驳回</button>
        </div>

        <!-- 第二行 -->
        <div class="action-row">
          <button class="action-btn secondary" (click)="onTransfer()">↷ 转交</button>
          <button class="action-btn secondary" (click)="onAddSign()">⊕ 加签</button>
        </div>

        <!-- 说明 -->
        <div class="helper-card">
          <div class="helper-title">辅助流转说明</div>
          <div class="helper-item">
            <span class="helper-label">转交：</span>
            当前节点责任人变更为其他审批人。
          </div>
          <div class="helper-item">
            <span class="helper-label">加签：</span>
            邀请他人补充意见，完成后回到当前审批人继续处理。
          </div>
        </div>
      </div>
    </div>

    <!-- 转交弹窗 -->
    <approval-transfer-dialog
      [open]="showTransferDialog()"
      [submitting]="isTransferring()"
      (submit)="handleTransfer($event)"
      (cancel)="closeTransferDialog()"
    />

    <!-- 加签弹窗 -->
    <countersign-affirm-dialog
      [open]="showCountersignDialog()"
      [submitting]="isCountersigning()"
      (submit)="handleCountersign($event)"
      (cancel)="closeCountersignDialog()"
    />

    <!-- 通过弹窗 -->
    <approval-pass-dialog
      [open]="showPassDialog()"
      [submitting]="isPassing()"
      (submit)="handlePass($event)"
      (cancel)="closePassDialog()"
    />

    <!-- 驳回弹窗 -->
    <approval-reject-dialog
      [open]="showRejectDialog()"
      [submitting]="isRejecting()"
      (submit)="handleReject($event)"
      (cancel)="closeRejectDialog()"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .approval-wrapper {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      /* ========= 流程 ========= */
      .approval-flow {
        display: flex;
        flex-direction: column;
      }

      .flow-item {
        display: flex;
        align-items: flex-start;
        position: relative;
      }

      .flow-left {
        width: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
      }

      .flow-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
        position: relative;
        z-index: 2;

        &.wait {
          background: var(--wait-color, #d7dee8);
          color: #ffffff;
        }

        &.process {
          background: var(--process-color, #5b5ce9);
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(91, 92, 233, 0.12);
        }

        &.finish {
          background: var(--finish-color, #52c41a);
          color: #ffffff;
        }
      }

      .flow-line {
        width: 2px;
        flex: 1;
        min-height: 36px;
        background: var(--line-color, #d7dee8);

        &.active {
          background: var(--finish-color, #52c41a);
        }
      }

      .flow-content {
        padding-left: 14px;
        padding-bottom: 26px;
      }

      .flow-title {
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1;
        color: var(--text-primary, #111827);
      }

      .flow-desc {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.4;
        color: var(--text-secondary, #8c8c8c);
      }

      .process-text {
        color: var(--process-color, #5b5ce9);
      }

      .finish-text {
        color: var(--finish-color, #52c41a);
      }

      /* ========= 审批面板 ========= */
      .approval-panel {
        border-top: 1px solid var(--border-color, #f0f0f0);
        padding-top: 24px;
      }

      .panel-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, #111827);
        margin-bottom: 14px;
      }

      .approval-textarea {
        width: 100%;
        min-height: 92px;
        resize: vertical;
        border-radius: 12px;
        border: 1px solid var(--border-color-input, #d9d9d9);
        padding: 14px;
        font-size: 14px;
        line-height: 1.6;
        outline: none;
        transition: all 0.2s ease;
        box-sizing: border-box;
        font-family: inherit;
        background-color: var(--bg-container, #ffffff);
        color: var(--text-primary, #111827);

        &:focus {
          border-color: var(--process-color, #5b5ce9);
          box-shadow: 0 0 0 3px rgba(91, 92, 233, 0.08);
        }

        &::placeholder {
          color: var(--text-placeholder, #bfbfbf);
        }
      }

      .action-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 14px;
      }

      .action-btn {
        height: 42px;
        border-radius: 12px;
        border: none;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .pass {
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: white;

        &:hover {
          background: linear-gradient(135deg, #4338ca, #4f46e5);
        }
      }

      .reject {
        background: linear-gradient(135deg, #ef4444, #f43f5e);
        color: white;

        &:hover {
          background: linear-gradient(135deg, #dc2626, #e11d48);
        }
      }

      .secondary {
        background: var(--bg-container, #ffffff);
        color: var(--text-secondary-btn, #374151);
        border: 1px solid var(--border-color-input, #d9d9d9);

        &:hover {
          border-color: var(--process-color, #5b5ce9);
          color: var(--process-color, #5b5ce9);
        }
      }

      .helper-card {
        margin-top: 16px;
        border-radius: 14px;
        background: var(--bg-helper, #f5f7fb);
        border: 1px solid var(--border-color-helper, #e5e7eb);
        padding: 16px;
      }

      .helper-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-primary, #111827);
        margin-bottom: 12px;
      }

      .helper-item {
        font-size: 13px;
        line-height: 1.7;
        color: var(--text-secondary, #6b7280);

        &:not(:last-child) {
          margin-bottom: 8px;
        }
      }

      .helper-label {
        font-weight: 600;
        color: var(--text-secondary-label, #374151);
      }

      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        --wait-color: #334155;
        --process-color: #6366f1;
        --finish-color: #22c55e;
        --line-color: #334155;
        --text-primary: #e2e8f0;
        --text-secondary: #94a3b8;
        --text-secondary-btn: #cbd5e1;
        --text-secondary-label: #cbd5e1;
        --text-placeholder: #64748b;
        --border-color: #334155;
        --border-color-input: #475569;
        --border-color-helper: #475569;
        --bg-container: #1e293b;
        --bg-helper: #0f172a;
      }
    `,
  ],
})
export class ApprovalFlowComponent {
  private messageService = inject(NzMessageService);
  // ========== 输入输出 ==========
  readonly action = output<{
    type: ApprovalAction;
    opinion: string;
    detail?: TransferData | CountersignData | ApprovalPassData | ApprovalRejectData;
  }>();

  readonly steps = input<ApprovalStep[]>([
    {
      id: 1,
      title: '报销人/出差人',
      status: 'finish',
    },
    {
      id: 2,
      title: '负责人',
      status: 'process',
    },
    {
      id: 3,
      title: '部门主管',
      status: 'wait',
    },
    {
      id: 4,
      title: '审核',
      status: 'wait',
    },
    {
      id: 5,
      title: '会计',
      status: 'wait',
    },
    {
      id: 6,
      title: '出纳',
      status: 'wait',
    },
    {
      id: 7,
      title: '完成',
      status: 'wait',
    },
  ]);

  // ========== 审批意见 ==========
  protected opinion = '';

  // ========== 弹窗显示状态 ==========
  protected showTransferDialog = signal(false);
  protected showCountersignDialog = signal(false);
  protected showPassDialog = signal(false);
  protected showRejectDialog = signal(false);

  // ========== 提交状态 ==========
  protected isTransferring = signal(false);
  protected isCountersigning = signal(false);
  protected isPassing = signal(false);
  protected isRejecting = signal(false);

  // ========== 计算属性 ==========
  protected readonly displaySteps = computed(() => {
    return this.steps().map((step) => ({
      ...step,
      desc: this.getStatusText(step.status),
    }));
  });

  // ========== 私有方法 ==========
  private getStatusText(status?: ApprovalStep['status']): string {
    switch (status) {
      case 'process':
        return '当前处理节点';
      case 'finish':
        return '已通过';
      case 'wait':
      default:
        return '待处理';
    }
  }

  private emitAction(type: ApprovalAction, detail?: any): void {
    this.action.emit({
      type,
      opinion: this.opinion.trim(),
      detail,
    });
  }

  private resetOpinion(): void {
    this.opinion = '';
  }

  // ========== 弹窗关闭方法 ==========
  protected closeTransferDialog(): void {
    this.showTransferDialog.set(false);
    this.isTransferring.set(false);
  }

  protected closeCountersignDialog(): void {
    this.showCountersignDialog.set(false);
    this.isCountersigning.set(false);
  }

  protected closePassDialog(): void {
    this.showPassDialog.set(false);
    this.isPassing.set(false);
    this.resetOpinion();
  }

  protected closeRejectDialog(): void {
    this.showRejectDialog.set(false);
    this.isRejecting.set(false);
    this.resetOpinion();
  }

  // ========== 审批操作 ==========
  protected onPass(): void {
    this.showPassDialog.set(true);
  }

  protected onReject(): void {
    this.showRejectDialog.set(true);
  }

  protected onTransfer(): void {
    this.showTransferDialog.set(true);
  }

  protected onAddSign(): void {
    this.showCountersignDialog.set(true);
  }

  // ========== 弹窗提交处理 ==========
  protected handleTransfer(data: TransferData): void {
    this.isTransferring.set(true);

    // 模拟异步提交
    setTimeout(() => {
      this.emitAction('transfer', data);
      console.log('转交审批：', {
        opinion: this.opinion,
        transferData: data,
      });
      this.closeTransferDialog();
    }, 500);
  }

  protected handleCountersign(data: CountersignData): void {
    this.isCountersigning.set(true);

    setTimeout(() => {
      this.emitAction('addSign', data);
      console.log('加签确认：', {
        opinion: this.opinion,
        countersignData: data,
      });
      this.closeCountersignDialog();
    }, 500);
  }

  protected handlePass(data: ApprovalPassData): void {
    this.isPassing.set(true);

    setTimeout(() => {
      this.emitAction('pass', data);
      console.log('审批通过：', {
        opinion: this.opinion,
        remark: data.remark,
      });
      this.closePassDialog();
    }, 500);
  }

  protected handleReject(data: ApprovalRejectData): void {
    this.isRejecting.set(true);

    setTimeout(() => {
      this.emitAction('reject', data);
      console.log('驳回单据：', {
        opinion: this.opinion,
        remark: data.remark,
      });
      this.closeRejectDialog();
    }, 500);
  }
}
