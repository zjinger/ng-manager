import { Component, computed, inject, input, output } from '@angular/core';
import { ISSUE_STATUS, ISSUE_STATUS_FILTER_OPTIONS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  IssueActionType,
  IssueEntity,
  IssueLogEntity,
  IssueStatus,
} from '@pages/issues/models/issue.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { log } from 'ng-zorro-antd/core/logger';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzStepsModule } from 'ng-zorro-antd/steps';

@Component({
  selector: 'app-issue-action-area',
  imports: [NzStepsModule, NzButtonModule, NzModalModule, DetailItemCardComponent],
  template: `
    <app-detail-item-card>
      <div class="action-area">
        <div class="steps">
          <nz-steps [nzCurrent]="getStepIndex(issue().status)" nzSize="small">
            @for (step of stepsOptions; track step.value) {
              <nz-step [nzTitle]="step.label" [nzStatus]="stepState(step.value)"></nz-step>
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
              {{ startActionLabel() }}
            </button>
          }
          @if (canClaim() && !canAssign()) {
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
          @if (canPendingUpdate()) {
            <button
              nz-button
              nzType="default"
              class="detail-header__action-btn"
              (click)="actionClick.emit('wait-update')"
            >
              标记待提测
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

          <!-- @if (canVerify()) {
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
        } -->
          <!-- @if (canClose()) {
          <button
            nz-button
            nzDanger
            nzType="default"
            class="detail-header__action-btn"
            (click)="actionClick.emit('close')"
          >
            关闭问题
          </button>
        } -->
        </div>
      </div>
    </app-detail-item-card>
  `,
  styles: `
    .action-btns {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    :host ::ng-deep .ant-steps-item-title::after {
      background-color: #d3d3d3 !important;
    }
  `,
})
export class IssueActionAreaComponent {
  readonly issue = input.required<IssueEntity>();
  readonly logs = input<IssueLogEntity[]>([]);
  readonly canStart = input(false);
  readonly canClaim = input(false);
  readonly canAssign = input(false);
  readonly canManageParticipants = input(false);
  readonly canResolve = input(false);
  readonly canPendingUpdate = input(false);
  readonly canVerify = input(false);
  readonly canReopen = input(false);
  readonly canClose = input(false);

  readonly assignActionLabel = input('重新指派');
  readonly startActionLabel = input('开始处理');

  readonly actionClick = output<IssueActionType>();

  readonly excutedStatuses = computed(() => {
    const executedStatusesSet = new Set();
    const openCutoff = this.latestOpenAt();
    this.logs().forEach((log, index) => {
      // 只显示最近一次打开（重新打开）之后的状态变更，之前的状态变更不再展示为已执行
      if (openCutoff !== null && Date.parse(log.createdAt) < openCutoff) {
        return;
      }
      executedStatusesSet.add(log.toStatus);
    });
    if (executedStatusesSet.has('resolved')) {
      executedStatusesSet.add('pending_update');
    }
    return executedStatusesSet;
  });

  readonly stepsOptions = ISSUE_STATUS_FILTER_OPTIONS.filter((opt) => {
    if (opt.value === 'reopened' || opt.value === '') {
      return false;
    }
    return true;
  }) as { label: string; value: Exclude<IssueStatus, 'reopened'> }[];

  // 根据logs标记经过的历史状态
  stepState(stepOptValue: Exclude<IssueStatus, 'reopened'>) {
    if (
      this.issue().status === stepOptValue ||
      (stepOptValue === 'open' && this.issue().status === 'reopened')
    ) {
      return 'process';
    }
    if (
      this.excutedStatuses().has(stepOptValue) ||
      (stepOptValue === 'open' && this.excutedStatuses().has('reopened'))
    ) {
      return 'finish';
    }
    return 'wait';
  }

  getStepIndex(status: IssueStatus): number {
    if (status === 'reopened') {
      return 0; // 重新打开状态特殊处理，显示在待处理
    }
    if (status === 'closed') {
      return 4; // 关闭状态显示在最后
    }
    const index = ISSUE_STATUS.findIndex((s) => s === status) ?? -1;
    return index;
  }

  // 获取最近一次打开（重新打开）的时间戳
  private latestOpenAt(): number | null {
    let latest: number | null = null;
    for (const log of this.logs()) {
      const isReopen = log.actionType === 'reopen' && log.toStatus === 'reopened';
      const isOpen = log.actionType === 'create' && log.toStatus === 'open';
      if (!isReopen && !isOpen) {
        continue;
      }
      const timestamp = Date.parse(log.createdAt);
      if (Number.isNaN(timestamp)) {
        continue;
      }
      if (latest === null || timestamp > latest) {
        latest = timestamp;
      }
    }
    return latest;
  }
}
