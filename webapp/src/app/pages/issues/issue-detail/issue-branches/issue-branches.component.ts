import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { UserStore } from '@app/core/stores';
import {
  ISSUE_BRANCH_STATUS_COLORS,
  ISSUE_BRANCH_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { IssueBranchEntity, IssueBranchSummary } from '@pages/issues/models/issue.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-issue-branches',
  imports: [DetailItemCardComponent, NzButtonModule, NzTagModule, CommonModule],
  template: `
    <app-detail-item-card
      title="协作分支"
      [emptyStatus]="!branches().length"
      [count]="branches().length"
      emptyText="当前还没有协作分支"
    >
      <div actions>
        @if (canStartActions() && canStartOwn()) {
          <button
            nz-button
            nz-tooltip="点击开始协作"
            nzType="default"
            nzSize="small"
            [nzLoading]="busy()"
            (click)="startOwn.emit()"
          >
            开始
          </button>
        }
        @if (canCreate()) {
          <button
            nz-button
            nz-tooltip="点击新建协作分支"
            nzType="primary"
            nzSize="small"
            [disabled]="busy()"
            (click)="create.emit()"
            class="create-btn"
          >
            新建
          </button>
        }
      </div>

      @if (branches().length > 0) {
        <div class="branch-summary">{{ branchSummaryText() }}</div>
        <div class="branch-list">
          @for (branch of branches(); track branch.id) {
            <article class="branch-card">
              <div class="branch-card__header">
                <div class="branch-card__title">{{ branch.title }}</div>
                <nz-tag [nzColor]="branchStatusColor(branch.status)">
                  {{ branchStatusLabel(branch.status) }}
                </nz-tag>
              </div>

              <div class="branch-card__meta">
                <span class="branch-card__owner">{{ branch.ownerUserName }}</span>
                <span>由 {{ branch.createdByName }} 创建</span>
                <span>{{ branch.updatedAt | date: 'MM-dd HH:mm' }} 更新</span>
              </div>

              @if (branch.summary) {
                <div class="branch-card__summary">{{ branch.summary }}</div>
              }
              <div class="branch-card__actions">
                @if (canStartActions() && isMine(branch) && branch.status === 'todo') {
                  <button
                    nz-button
                    nzType="default"
                    nzSize="small"
                    [nzLoading]="busy()"
                    (click)="startBranch.emit(branch.id)"
                    class="action-btn"
                  >
                    开始处理
                  </button>
                }
                @if (canCompleteBranch() && isMine(branch) && branch.status === 'in_progress') {
                  <button
                    nz-button
                    nzType="primary"
                    nzSize="small"
                    nz-popconfirm
                    nzPopconfirmTitle="确认标记该协作分支已完成？"
                    nzPopconfirmOkText="完成"
                    nzPopconfirmCancelText="取消"
                    [nzLoading]="busy()"
                    (nzOnConfirm)="completeBranch.emit(branch.id)"
                    class="action-btn"
                  >
                    标记完成
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }
    </app-detail-item-card>
  `,
  styleUrl: './issue-branches.component.less',
})
export class IssueBranchesComponent {
  private userStore = inject(UserStore);
  readonly branches = input<IssueBranchEntity[]>([]);
  readonly summary = input<IssueBranchSummary>();
  readonly canCreate = input(false);
  readonly canStartActions = input(false);
  readonly canStartOwn = input(false);
  readonly canCompleteBranch = input(false);
  readonly busy = input(false);

  readonly create = output<void>();
  readonly startOwn = output<void>();
  readonly startBranch = output<string>();
  readonly completeBranch = output<string>();

  readonly branchSummaryText = computed(() => {
    const stats = this.summary();
    if (!stats) return '';
    if (stats.total === 0) {
      return '当前没有协作分支';
    }
    const parts = [`已完成 ${stats.done}`];
    if (stats.inProgress > 0) {
      parts.push(`处理中 ${stats.inProgress}`);
    }
    if (stats.todo > 0) {
      parts.push(`待开始 ${stats.todo}`);
    }
    return parts.join('，');
  });

  isMine(branch: IssueBranchEntity): boolean {
    return this.userStore.currentUserId() === branch.ownerUserId;
  }

  branchStatusLabel(status: IssueBranchEntity['status']): string {
    return ISSUE_BRANCH_STATUS_LABELS[status] ?? status;
  }

  branchStatusColor(status: IssueBranchEntity['status']): string {
    return ISSUE_BRANCH_STATUS_COLORS[status] ?? 'default';
  }
}
