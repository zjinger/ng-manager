import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ISSUE_STATUS_LABELS } from '@shared/constants';
import type { IssueEntity } from '../../models/issue.model';
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
              <span nz-icon nzType="right" class="state-flow__arrow"></span>
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
          @if (canStart()&& !canResolve()) {
            <button nz-button nzType="default" class="detail-header__action-btn" (click)="start.emit()">开始处理</button>
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
        justify-content: flex-end;
      }
      .state-flow {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .state-flow__step {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 72px;
        height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.14);
        color: var(--primary-700);
      }
      .state-flow__step.is-active {
        background: var(--primary-600);
        color: #fff;
      }
      .state-flow__arrow {
        color: var(--gray-300);
        font-size: 12px;
      }
      :host-context(html[data-theme='dark']) .detail-header {
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .state-flow__step.is-done {
        background: rgba(99, 102, 241, 0.18);
      }
      .detail-header__action-btn {
        min-width: 108px;
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
    { value: 'resolved', label: ISSUE_STATUS_LABELS['resolved'] },
    { value: 'verified', label: ISSUE_STATUS_LABELS['verified'] },
    { value: 'closed', label: ISSUE_STATUS_LABELS['closed'] },
  ] as const;

  readonly issue = input.required<IssueEntity>();
  readonly canStart = input(false);
  readonly canClaim = input(false);
  readonly canAssign = input(false);
  readonly assignActionLabel = input('重新指派');
  readonly canEdit = input(false);
  readonly canManageParticipants = input(false);
  readonly canResolve = input(false);
  readonly canVerify = input(false);
  readonly canReopen = input(false);
  readonly canClose = input(false);
  readonly branchSummaryText = input('');

  readonly start = output<void>();
  readonly claim = output<void>();
  readonly assign = output<void>();
  readonly edit = output<void>();
  readonly addParticipants = output<void>();
  readonly resolve = output<void>();
  readonly verify = output<void>();
  readonly reopen = output<void>();
  readonly close = output<void>();

  stepState(step: (typeof this.flowSteps)[number]['value']): 'done' | 'active' | 'pending' {
    const order = this.flowSteps.map((item) => item.value);
    const current = this.issue().status === 'reopened' ? 'in_progress' : this.issue().status;
    const stepIndex = order.indexOf(step);
    const currentIndex = order.indexOf(current as (typeof this.flowSteps)[number]['value']);
    if (stepIndex === currentIndex) {
      return 'active';
    }
    if (stepIndex < currentIndex) {
      return 'done';
    }
    return 'pending';
  }
}
