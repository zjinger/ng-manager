import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { StatusBadgeComponent } from '@shared/ui';
import {
  RD_TASK_SHEET_STATUS_LABELS,
  type RdTaskSheetDetail,
  type RdTaskSheetStatus,
} from '../../models/rd-task-sheet.model';

type ConvertKind = 'rd' | 'issue';
type FlowStepId = 'prepare' | 'review' | 'issued' | 'processing' | 'delivered' | 'verified';

@Component({
  selector: 'app-rd-task-sheet-detail-header',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzPopconfirmModule, StatusBadgeComponent],
  template: `
    @if (detail(); as current) {
      <section class="detail-header">
        <div class="detail-header__top">
          <div class="detail-header__meta">
            <span></span>
            <span class="detail-header__status">当前：{{ currentFlowLabel(current.status) }}</span>
          </div>
          <div class="state-flow">
            @for (step of statusFlow(current.status); track step.id; let last = $last) {
              <span
                class="state-flow__step"
                [class.is-done]="step.state === 'done'"
                [class.is-active]="step.state === 'active'"
              >
                {{ step.label }}
              </span>
              @if (!last) {
                <span
                  nz-icon
                  nzType="right"
                  class="state-flow__arrow"
                  [class.is-done]="step.state !== 'pending'"
                ></span>
              }
            }
          </div>
        </div>
        <div class="detail-header__bottom">
          <div class="detail-header__bottom-main">
            <div class="detail-header__actions">
            <button nz-button class="detail-header__action-btn" [nzLoading]="exporting()" (click)="exportWord.emit(current)">
              <span nz-icon nzType="download"></span>
              导出 Word
            </button>
            @if (current.convertedRdItemId) {
              <app-status-badge status="converted_rd" label="已转研发项" />
            }
            @if (canAssign(current)) {
              <button nz-button class="detail-header__action-btn" (click)="convert.emit('rd')">转研发项</button>
            }
            @if (current.convertedIssueId) {
              <app-status-badge status="converted_issue" label="已转测试单" />
            }
            @if (canAssign(current)) {
              <button nz-button class="detail-header__action-btn" (click)="convert.emit('issue')">转测试单</button>
            }
            @if (canEdit(current)) {
              <button nz-button class="detail-header__action-btn" (click)="edit.emit(current)">编辑</button>
            }
            @if (canDelete(current)) {
              <button
                nz-button
                class="detail-header__action-btn"
                nzDanger
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认删除该任务单？"
                nzPopconfirmOkText="删除"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="deleteSheet.emit(current.id)"
              >
                删除
              </button>
            }
            @if (canSubmitReview(current) && current.status === 'draft') {
              <button
                nz-button
                class="detail-header__action-btn"
                nzType="primary"
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认提交该任务单进入审核？"
                nzPopconfirmOkText="提交"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="submitReview.emit(current.id)"
              >
                提交审核
              </button>
            }
            @if (canSubmitReview(current) && current.status === 'returned') {
              <button
                nz-button
                class="detail-header__action-btn"
                nzType="primary"
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认重新提交该任务单进入审核？"
                nzPopconfirmOkText="提交"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="submitReview.emit(current.id)"
              >
                重新提交
              </button>
            }
            @if (canReview(current)) {
              <button nz-button class="detail-header__action-btn" (click)="returnReview.emit(current)">退回</button>
              <button
                nz-button
                class="detail-header__action-btn"
                nzType="primary"
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认审核通过并下发给接收人？"
                nzPopconfirmOkText="下发"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="approveReview.emit(current.id)"
              >
                审核下发
              </button>
            }
            @if (canAssign(current)) {
              <button nz-button class="detail-header__action-btn" (click)="assign.emit(current)">分派处理</button>
            }
            @if (canStartProcessing(current)) {
              <button
                nz-button
                class="detail-header__action-btn"
                nzType="primary"
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认开始处理该任务单？"
                nzPopconfirmOkText="开始处理"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="startProcessing.emit(current.id)"
              >
                开始处理
              </button>
            }
            @if (canShowReply(current)) {
              <button
                nz-button
                class="detail-header__action-btn"
                [disabled]="!linkedTargetsCompleted(current)"
                (click)="reply.emit(current)"
              >
                交付/答复
              </button>
            }
            @if (canAccept(current)) {
              <button
                nz-button
                class="detail-header__action-btn"
                nzType="primary"
                [nzLoading]="busy()"
                nz-popconfirm
                nzPopconfirmTitle="确认验收通过该任务单？"
                nzPopconfirmOkText="验收通过"
                nzPopconfirmCancelText="取消"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="closeSheet.emit(current.id)"
              >
                验收通过
              </button>
            }
            </div>
          </div>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .detail-header {
        display: grid;
        gap: 18px;
        padding: 22px 20px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
          var(--bg-container);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }
      .detail-header__top {
        display: grid;
        gap: 10px;
      }
      .detail-header__bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      .detail-header__bottom-main {
        display: grid;
        gap: 12px;
        width: 100%;
      }
      .detail-header__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 18px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .detail-header__status {
        color: var(--text-secondary);
        font-weight: 600;
        white-space: nowrap;
      }
      .detail-header__actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .detail-header__action-btn {
        min-width: 76px;
        max-width: 100%;
        height: 36px;
        border-radius: 999px;
      }
      .state-flow {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px;
        flex-wrap: nowrap;
        width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        padding-right: 4px;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }
      .state-flow__step {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        min-width: 64px;
        height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: var(--bg-subtle);
        border: 1px solid transparent;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease;
      }
      .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.08);
        border-color: rgba(99, 102, 241, 0.18);
        color: rgba(79, 70, 229, 0.88);
      }
      .state-flow__step.is-active {
        background: var(--primary-600);
        border-color: var(--primary-600);
        color: #fff;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
        transform: translateY(-1px);
      }
      .state-flow__arrow {
        flex: 0 0 auto;
        color: var(--gray-300);
        font-size: 11px;
        transition: color 160ms ease;
      }
      .state-flow__arrow.is-done {
        color: rgba(99, 102, 241, 0.5);
      }
      .state-flow::-webkit-scrollbar {
        height: 6px;
      }
      .state-flow::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.35);
        border-radius: 999px;
      }
      :host-context(html[data-theme='dark']) .detail-header {
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.14);
        border-color: rgba(129, 140, 248, 0.26);
        color: #c7d2fe;
      }
      :host-context(html[data-theme='dark']) .state-flow__step.is-active {
        box-shadow: 0 12px 28px rgba(99, 102, 241, 0.32);
      }
      :host-context(html[data-theme='dark']) .state-flow__arrow.is-done {
        color: rgba(165, 180, 252, 0.55);
      }
      @media (max-width: 720px) {
        .detail-header__top,
        .detail-header__bottom {
          align-items: flex-start;
          flex-direction: column;
        }
        .detail-header__actions,
        .state-flow {
          justify-content: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetDetailHeaderComponent {
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly currentUserId = input('');
  readonly permissionCodes = input<string[]>([]);
  readonly busy = input(false);
  readonly exporting = input(false);
  readonly exportWord = output<RdTaskSheetDetail>();
  readonly convert = output<ConvertKind>();
  readonly edit = output<RdTaskSheetDetail>();
  readonly issue = output<string>();
  readonly submitReview = output<string>();
  readonly approveReview = output<string>();
  readonly returnReview = output<RdTaskSheetDetail>();
  readonly assign = output<RdTaskSheetDetail>();
  readonly startProcessing = output<string>();
  readonly reply = output<RdTaskSheetDetail>();
  readonly closeSheet = output<string>();
  readonly deleteSheet = output<string>();

  statusLabel(status: RdTaskSheetStatus): string {
    return RD_TASK_SHEET_STATUS_LABELS[status] ?? status;
  }

  statusFlow(status: RdTaskSheetStatus): Array<{ id: FlowStepId; label: string; state: 'done' | 'active' | 'pending' }> {
    const steps: Array<{ id: FlowStepId; label: string }> = [
      { id: 'prepare', label: '制单' },
      { id: 'review', label: '审核' },
      { id: 'issued', label: '已下发' },
      { id: 'processing', label: '处理中' },
      { id: 'delivered', label: '已交付' },
      { id: 'verified', label: '已验证' },
    ];
    const activeId = this.activeFlowId(status);
    return steps.map((step) => {
      if (step.id === activeId) {
        return { ...step, state: 'active' as const };
      }
      if (this.isReachedFlow(step.id, activeId)) {
        return { ...step, state: 'done' as const };
      }
      return { ...step, state: 'pending' as const };
    });
  }

  currentFlowLabel(status: RdTaskSheetStatus): string {
    return this.statusFlow(status).find((step) => step.state === 'active')?.label ?? statusLabel(status);
  }

  canEdit(detail: RdTaskSheetDetail): boolean {
    return this.canSubmitOwn(detail) && (detail.status === 'draft' || detail.status === 'returned');
  }

  canDelete(detail: RdTaskSheetDetail): boolean {
    return this.canSubmitOwn(detail) && (detail.status === 'draft' || detail.status === 'returned');
  }

  canSubmitReview(detail: RdTaskSheetDetail): boolean {
    return this.canSubmitOwn(detail) && (detail.status === 'draft' || detail.status === 'returned');
  }

  canReview(detail: RdTaskSheetDetail): boolean {
    return detail.status === 'pending_review' && this.hasTaskPermission('task_sheet.review');
  }

  canAssign(detail: RdTaskSheetDetail): boolean {
    return (detail.status === 'issued' || detail.status === 'processing') && this.hasTaskPermission('task_sheet.assign') && this.isReceiverOrProcessor(detail);
  }

  canStartProcessing(detail: RdTaskSheetDetail): boolean {
    return detail.status === 'issued' && (this.isReceiverOrProcessor(detail) || this.hasPermission('task_sheet.manage'));
  }

  canShowReply(detail: RdTaskSheetDetail): boolean {
    return (detail.status === 'issued' || detail.status === 'processing') && this.hasTaskPermission('task_sheet.deliver') && this.isReceiverOrProcessor(detail);
  }

  canAccept(detail: RdTaskSheetDetail): boolean {
    if (detail.status !== 'replied' || !this.hasTaskPermission('task_sheet.accept')) {
      return false;
    }
    return this.hasPermission('task_sheet.manage') || this.isCreatorOrIssuerOrReviewer(detail);
  }

  linkedTargetsCompleted(detail: RdTaskSheetDetail): boolean {
    return !detail.linkedTargets?.length || detail.linkedTargets.every((target) => target.completed);
  }

  private canSubmitOwn(detail: RdTaskSheetDetail): boolean {
    return this.hasTaskPermission('task_sheet.submit') && (this.hasPermission('task_sheet.manage') || this.isCreatorOrIssuer(detail));
  }

  private hasTaskPermission(code: string): boolean {
    return this.hasPermission(code) || this.hasPermission('task_sheet.manage');
  }

  private hasPermission(code: string): boolean {
    return this.permissionCodes().includes(code);
  }

  private isCreatorOrIssuer(detail: RdTaskSheetDetail): boolean {
    const userId = this.currentUserId();
    return Boolean(userId && (detail.creatorId === userId || detail.issuerUserId === userId));
  }

  private isCreatorOrIssuerOrReviewer(detail: RdTaskSheetDetail): boolean {
    const userId = this.currentUserId();
    return Boolean(userId && (detail.creatorId === userId || detail.issuerUserId === userId || detail.reviewerUserId === userId));
  }

  private isReceiverOrProcessor(detail: RdTaskSheetDetail): boolean {
    if (this.hasPermission('task_sheet.manage')) {
      return true;
    }
    const userId = this.currentUserId();
    return Boolean(userId && (detail.receiverUserId === userId || detail.processorUserId === userId));
  }

  private activeFlowId(status: RdTaskSheetStatus): FlowStepId {
    if (status === 'pending_review') {
      return 'review';
    }
    if (status === 'issued') {
      return 'issued';
    }
    if (status === 'processing') {
      return 'processing';
    }
    if (status === 'replied') {
      return 'delivered';
    }
    if (status === 'closed') {
      return 'verified';
    }
    return 'prepare';
  }

  private isReachedFlow(target: FlowStepId, active: FlowStepId): boolean {
    const order: FlowStepId[] = ['prepare', 'review', 'issued', 'processing', 'delivered', 'verified'];
    return order.indexOf(target) < order.indexOf(active);
  }
}

function statusLabel(status: RdTaskSheetStatus): string {
  return RD_TASK_SHEET_STATUS_LABELS[status] ?? status;
}
