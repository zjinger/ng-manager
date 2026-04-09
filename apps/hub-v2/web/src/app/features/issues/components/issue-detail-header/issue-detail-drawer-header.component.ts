import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ISSUE_STATUS_LABELS } from '@shared/constants';
import type { IssueEntity, IssueLogEntity } from '../../models/issue.model';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-issue-detail-drawer-header',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzPopconfirmModule],
  template: `
    <section class="detail-header">
      <div class="detail-header__top">
        <div class="state-flow">
          @for (step of flowSteps; track step.value; let last = $last) {
            <span
              class="state-flow__step"
              [class.is-done]="stepState(step.value) === 'done'"
              [class.is-active]="stepState(step.value) === 'active'"
            >
              {{ step.label }}
            </span>
            @if (!last) {
              <span
                nz-icon
                nzType="right"
                class="state-flow__arrow"
                [class.is-done]="stepState(step.value) !== 'pending'"
              ></span>
            }
          }
        </div>
      </div>
      <div class="detail-header__bottom">
        <div class="detail-header__bottom-main">
          @if (branchSummaryText()) {
            <div class="detail-header__summary">{{ branchSummaryText() }}</div>
          }
          <div class="detail-header__actions">
          @if (canStart()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="start.emit()">{{ startActionLabel() }}</button>
          }
          @if (canClaim() && !canAssign()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="claim.emit()">认领</button>
          }
          @if (canAssign()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="assign.emit()">{{ assignActionLabel() }}</button>
          }
          @if (canEdit()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="edit.emit()">编辑</button>
          }
          @if (canManageParticipants()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="addParticipants.emit()">添加协作人</button>
          }
          @if (canWaitForUpdate()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="waitForUpdate.emit()">标记待提测</button>
          }
          @if (canResolve()) {
            <button nz-button nzType="primary" class="detail-header__action-btn" (click)="resolve.emit()">标记解决</button>
          }
          @if (canVerify()) {
            <button nz-button nzType="primary" class="detail-header__action-btn"  nz-popconfirm nzPopconfirmTitle="确定验证通过吗？" nzPopconfirmOkText="确定" nzPopconfirmCancelText="取消" (nzOnConfirm)="verify.emit()">验证通过</button>
          }
          @if (canReopen()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="reopen.emit()">重新打开</button>
          }
          @if (canClose()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="close.emit()">关闭问题</button>
          }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .detail-header {
        display: grid;
        gap: 18px;
        padding: 26px 28px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
          var(--bg-container);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }
      .detail-header__top {
        display: flex;
        justify-content: space-between;
        gap: 20px;
      }
      .detail-header__bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 18px;
        border-top: 1px solid var(--border-color-soft);
      }
      .detail-header__bottom-main {
        display: grid;
        gap: 12px;
        width: 100%;
      }
      .detail-header__identity {
        min-width: 0;
      }
      .detail-header__meta {
        color: var(--primary-700);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 10px 0 0;
        font-size: 30px;
        line-height: 1.2;
        color: var(--text-primary);
      }
      .detail-header__badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .detail-header__summary {
        color: var(--text-secondary);
        font-size: 13px;
      }
      .detail-header__actions {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      .state-flow {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        flex-wrap: nowrap;
        width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }
      .state-flow__step {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        min-width: 72px;
        height: 32px;
        padding: 0 12px;
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
        font-size: 12px;
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
      .detail-header__action-btn {
        min-width: 84px;
        border-radius: 999px;
        height: 40px;
      }
      @media (max-width: 960px) {
        .detail-header__top,
        .detail-header__bottom {
          flex-direction: column;
          align-items: flex-start;
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
export class IssueDetailDrawerHeaderComponent {
  readonly flowSteps = [
    { value: 'open', label: ISSUE_STATUS_LABELS['open'] },
    { value: 'in_progress', label: ISSUE_STATUS_LABELS['in_progress'] },
    { value: 'pending_update', label: ISSUE_STATUS_LABELS['pending_update'] },
    { value: 'resolved', label: ISSUE_STATUS_LABELS['resolved'] },
    { value: 'verified', label: ISSUE_STATUS_LABELS['verified'] },
    { value: 'closed', label: ISSUE_STATUS_LABELS['closed'] },
  ] as const;

  readonly issue = input.required<IssueEntity>();
  readonly logs = input<IssueLogEntity[]>([]);
  readonly canStart = input(false);
  readonly startActionLabel = input('开始处理');
  readonly canClaim = input(false);
  readonly canAssign = input(false);
  readonly assignActionLabel = input('重新指派');
  readonly canEdit = input(false);
  readonly canManageParticipants = input(false);
  readonly canWaitForUpdate = input(false);
  readonly canResolve = input(false);
  readonly canVerify = input(false);
  readonly canReopen = input(false);
  readonly canClose = input(false);
  readonly branchSummaryText = input('');

  readonly start = output<void>();
  readonly waitForUpdate = output<void>();
  readonly claim = output<void>();
  readonly assign = output<void>();
  readonly edit = output<void>();
  readonly addParticipants = output<void>();
  readonly resolve = output<void>();
  readonly verify = output<void>();
  readonly reopen = output<void>();
  readonly close = output<void>();

  stepState(step: (typeof this.flowSteps)[number]['value']): 'done' | 'active' | 'pending' {
    const reached = this.reachedSteps();
    const current = this.currentStep(reached);
    if (step === current) {
      return 'active';
    }
    if (reached.has(step)) {
      return 'done';
    }
    return 'pending';
  }

  private reachedSteps(): Set<(typeof this.flowSteps)[number]['value']> {
    const issue = this.issue();
    const reached = new Set<(typeof this.flowSteps)[number]['value']>(['open']);
    const addStep = (status: string | null | undefined) => {
      if (status === 'open' || status === 'in_progress' || status === 'pending_update' || status === 'resolved' || status === 'verified' || status === 'closed') {
        reached.add(status);
      }
    };

    for (const log of this.logs()) {
      addStep(log.fromStatus);
      addStep(log.toStatus);
    }

    addStep(issue.status);
    if (issue.startedAt) {
      reached.add('in_progress');
    }
    if (issue.resolvedAt) {
      reached.add('resolved');
    }
    if (issue.verifiedAt) {
      reached.add('verified');
    }
    if (issue.closedAt) {
      reached.add('closed');
    }

    if (reached.has('resolved') || reached.has('verified')) {
      reached.add('pending_update');
    }

    return reached;
  }

  private currentStep(reached: Set<(typeof this.flowSteps)[number]['value']>): (typeof this.flowSteps)[number]['value'] {
    const status = this.issue().status;
    if (status === 'reopened') {
      return reached.has('in_progress') ? 'in_progress' : 'open';
    }
    if (status === 'open' || status === 'in_progress' || status === 'pending_update' || status === 'resolved' || status === 'verified' || status === 'closed') {
      return status;
    }
    return 'open';
  }
}
