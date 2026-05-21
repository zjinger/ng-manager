import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
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
import { HasPermissionDirective } from '@app/core/auth/has-permission.directive';
import { ReimbursementApprovalPreview } from '@app/features/reimbursement/models/reimbursement.model';
import { ApprovalAction, ApprovalActionService } from '../../services/approval-action.service';
import {
  FlowDisplayNode,
  getAssigneeNames,
  getStatusText,
  transformToDisplayNodes,
} from '../../utils/approval-flow-display.util';

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
    HasPermissionDirective,
  ],
  providers: [ApprovalActionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="approval-wrapper">
      <!-- 流程 -->
      <div class="approval-flow">
      @for (node of displayNodes(); track $index; let last = $last) {
        <div class="flow-item">
          <div class="flow-left">
            <div
              class="flow-circle"
              [class.wait]="node.status === 'wait'"
              [class.process]="node.status === 'process'"
              [class.finish]="node.status === 'finish'"
              [class.rejected]="node.status === 'rejected'"
              [class.cancelled]="node.status === 'cancelled'"
            >
              {{ node.index }}
            </div>
            @if (!last) {
            <div class="flow-line" [class.active]="isLineActive(node)"></div>
            }
          </div>

          <div class="flow-content">
            <div class="flow-title">
              {{ node.stageName }}
              @if (node.assignees && node.assignees.length > 0) {
              <span class="assignee-badge">
                {{ getAssigneeNames(node.assignees) }}
              </span>
              }
            </div>
            <div
              class="flow-desc"
              [class.process-text]="node.status === 'process'"
              [class.finish-text]="node.status === 'finish'"
            >
              {{ getStatusText(node.status) }}
            </div>
          </div>
        </div>
        }
      </div>

      @if (showActions()) {
        <!-- 审批意见 -->
        <div class="approval-panel" *appHasPermission="['expense.rule.manage']">
          <div class="panel-title">备注说明</div>
          <textarea
            class="approval-textarea"
            [(ngModel)]="comment"
            placeholder="请输入相关备注说明，例如：票据完整，同意报销"
          ></textarea>

          <div class="action-row action-row--primary">
            <button class="action-btn pass" (click)="onPass()">通过</button>
            <button class="action-btn reject" (click)="onReject()">驳回</button>
          </div>
        </div>
      }
    </div>

    @if (showActions()) {
      <!-- 弹窗组件 -->
      <approval-transfer-dialog
        [open]="approvalAction.showTransferDialog()"
        [submitting]="approvalAction.isTransferring()"
        (submit)="handleTransfer($event)"
        (cancel)="approvalAction.closeTransferDialog()"
      />

      <countersign-affirm-dialog
        [open]="approvalAction.showCountersignDialog()"
        [submitting]="approvalAction.isCountersigning()"
        (submit)="handleCountersign($event)"
        (cancel)="approvalAction.closeCountersignDialog()"
      />

      <approval-pass-dialog
        [open]="approvalAction.showPassDialog()"
        [submitting]="approvalAction.isPassing()"
        (submit)="handlePass($event)"
        (cancel)="approvalAction.closePassDialog()"
      />

      <approval-reject-dialog
        [open]="approvalAction.showRejectDialog()"
        [submitting]="approvalAction.isRejecting()"
        (submit)="handleReject($event)"
        (cancel)="approvalAction.closeRejectDialog()"
      />
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .approval-wrapper {
        display: flex;
        flex-direction: column;
        gap: 20px;
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
        min-height: 62px;
      }

      .flow-left {
        width: 32px;
        align-self: stretch;
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

        &.rejected {
          background: #ef4444;
          color: #ffffff;
        }

        &.cancelled {
          background: #8c8c8c;
          color: #ffffff;
        }
      }

      .flow-line {
        width: 2px;
        flex: 1 1 auto;
        min-height: 34px;
        margin-top: 0;
        background: var(--line-color, #d7dee8);

        &.active {
          background: var(--finish-color, #52c41a);
        }
      }

      .flow-content {
        padding-left: 14px;
        padding-bottom: 18px;
        flex: 1;
      }

      .flow-title {
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1;
        color: var(--text-primary, #111827);
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .assignee-badge {
        font-size: 12px;
        font-weight: 400;
        background: #f3f4f6;
        padding: 4px 10px;
        border-radius: 20px;
        color: #374151;
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

      /* 演示模式提示 */
      .demo-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 8px;
        font-size: 13px;
        color: #0050b3;
        margin-bottom: 8px;

        nz-icon {
          font-size: 14px;
        }
      }

      :host-context(html[data-theme='dark']) .demo-tip {
        background: #0c2a3e;
        border-color: #1e4a6e;
        color: #7ab8e6;
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

      /* 暗色主题下 badge 样式覆盖 */
      :host-context(html[data-theme='dark']) .assignee-badge {
        background: #334155;
        color: #cbd5e1;
      }
    `,
  ],
})
export class ApprovalFlowComponent {
  public approvalAction = inject(ApprovalActionService);

  // ========== 输入输出 ==========
  readonly action = output<{
    type: ApprovalAction;
    opinion: string;
    detail?: any;
  }>();

  readonly approvalPreview = input<ReimbursementApprovalPreview | null>(null);
  readonly showActions = input(false);

  // ========== 审批意见 ==========
  protected comment = '';

  // ========== 计算属性 ==========
  protected readonly displayNodes = computed<FlowDisplayNode[]>(() => {
    return transformToDisplayNodes(this.approvalPreview()?.nodes);
  });

  // ========== 工具方法（模板使用） ==========
  protected getStatusText = getStatusText;
  protected getAssigneeNames = getAssigneeNames;

  // ========== 私有方法 ==========
  private syncComment(): void {
    this.approvalAction.setComment(this.comment);
  }

  private emitAction(type: ApprovalAction, detail?: any): void {
    this.action.emit({
      type,
      opinion: this.comment.trim(),
      detail,
    });
  }

  // ========== 判断流程线是否激活 ==========
  protected isLineActive(node: FlowDisplayNode): boolean {
    const nodes = this.displayNodes();
    const currentIndex = nodes.findIndex((n) => n.stageCode === node.stageCode);
    const prevNode = nodes[currentIndex];
    return prevNode?.status === 'finish';
  }

  // ========== 审批操作 ==========
  protected onPass(): void {
    if (!this.approvalAction.checkApprovalPreview(!!this.approvalPreview())) return;
    this.syncComment();
    this.approvalAction.openPassDialog();
  }

  protected onReject(): void {
    if (!this.approvalAction.checkApprovalPreview(!!this.approvalPreview())) return;
    this.syncComment();
    this.approvalAction.openRejectDialog();
  }

  protected onTransfer(): void {
    if (!this.approvalAction.checkApprovalPreview(!!this.approvalPreview())) return;
    this.syncComment();
    this.approvalAction.openTransferDialog();
  }

  protected onAddSign(): void {
    if (!this.approvalAction.checkApprovalPreview(!!this.approvalPreview())) return;
    this.syncComment();
    this.approvalAction.openCountersignDialog();
  }

  // ========== 弹窗提交处理 ==========
  protected async handleTransfer(data: TransferData): Promise<void> {
    await this.approvalAction.submitWithLoading(
      this.approvalAction.isTransferring,
      () => {
        this.emitAction('transfer', data);
        return { type: 'transfer', opinion: this.comment, detail: data };
      }
    );
    this.approvalAction.closeTransferDialog();
  }

  protected async handleCountersign(data: CountersignData): Promise<void> {
    await this.approvalAction.submitWithLoading(
      this.approvalAction.isCountersigning,
      () => {
        this.emitAction('addSign', data);
        return { type: 'addSign', opinion: this.comment, detail: data };
      }
    );
    this.approvalAction.closeCountersignDialog();
  }

  protected async handlePass(data: ApprovalPassData): Promise<void> {
    await this.approvalAction.submitWithLoading(
      this.approvalAction.isPassing,
      () => {
        this.emitAction('pass', data);
        return { type: 'pass', opinion: this.comment, detail: data };
      }
    );
    this.approvalAction.closePassDialog();
  }

  protected async handleReject(data: ApprovalRejectData): Promise<void> {
    await this.approvalAction.submitWithLoading(
      this.approvalAction.isRejecting,
      () => {
        this.emitAction('reject', data);
        return { type: 'reject', opinion: this.comment, detail: data };
      }
    );
    this.approvalAction.closeRejectDialog();
  }
}
