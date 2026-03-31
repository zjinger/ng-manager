import { Component, inject, input, output } from '@angular/core';
import {
  ISSUE_STATUS,
  ISSUE_STATUS_FILTER_OPTIONS,
  ISSUE_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { IssueActionType, IssueEntity, IssueStatus } from '@pages/issues/models/issue.model';
import { IssuePermissionService } from '@pages/issues/services/issue-permission.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzStepsModule } from 'ng-zorro-antd/steps';

@Component({
  selector: 'app-issue-action-area',
  imports: [NzStepsModule,NzButtonModule],
  template: `
    <div class="action-area">
      <div class="steps">
        <nz-steps [nzCurrent]="getStepIndex(issue().status)" nzSize="small">
          @for (step of stepsOptions; track step.value) {
            <nz-step [nzTitle]="step.label"></nz-step>
          }
        </nz-steps>
      </div>
      <div class="action-btns">
        @if (canStart()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('start')"
          >
            开始处理
          </button>
        }
        @if (canClaim()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('claim')"
          >
            认领
          </button>
        }
        @if (canAssign()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('assign')"
          >
            {{ assignActionLabel() }}
          </button>
        }
        @if (canManageParticipants()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('add_participants')"
          >
            添加协作人
          </button>
        }
        @if (canResolve()) {
          <button
            nz-button
            nzType="primary"
            class="detail-header__action-btn"
            (click)="actionClick.emit('resolve')"
          >
            标记解决
          </button>
        }
        @if (canVerify()) {
          <button
            nz-button
            nzType="primary"
            class="detail-header__action-btn"
            (click)="actionClick.emit('verify')"
          >
            验证通过
          </button>
        }
        @if (canReopen()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('reopen')"
          >
            重新打开
          </button>
        }
        @if (canClose()) {
          <button
            nz-button
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('close')"
          >
            关闭问题
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './issue-action-area.component.less',
})
export class IssueActionAreaComponent {
  private readonly issuePermissions = inject(IssuePermissionService);
  readonly issue = input.required<IssueEntity>();

  readonly canStart = input(false);
  readonly canClaim = input(false);
  readonly canAssign = input(false);
  readonly assignActionLabel = input('重新指派');
  readonly canManageParticipants = input(false);
  readonly canResolve = input(false);
  readonly canVerify = input(false);
  readonly canReopen = input(false);
  readonly canClose = input(false);

  readonly actionClick = output<IssueActionType>();
  readonly stepsOptions = ISSUE_STATUS_FILTER_OPTIONS.filter((opt) => {
    if (opt.value === 'reopened' || opt.value === '') {
      return false;
    }
    return true;
  });

  getStepIndex(status: IssueStatus): number {
    if (status === 'reopened') {
      return 1; // 重新打开状态特殊处理，显示在处理中
    }
    if (status === 'closed') {
      return 4; // 关闭状态显示在最后
    }
    const index = ISSUE_STATUS.findIndex((s) => s === status) ?? -1;
    return index;
  }
}
