import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { PanelCardComponent, StatusBadgeComponent } from '@shared/ui';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type { IssueBranchEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-branches-panel',
  standalone: true,
  imports: [DatePipe, NzButtonModule, NzIconModule, NzTooltipModule, NzPopconfirmModule, PanelCardComponent, StatusBadgeComponent],
  template: `
    <app-panel-card title="协作分支" [count]="branches().length" [empty]="branches().length === 0" emptyText="当前还没有协作分支">
      <div panel-actions class="panel-actions">
        @if (canStartActions() && canStartOwn()) {
          <button nz-button nz-tooltip="点击开始协作" nzType="default" nzSize="small" [nzLoading]="busy()" (click)="startOwn.emit()">开始</button>
        }
        @if (canCreate()) {
          <button nz-button nz-tooltip="点击新建协作分支" nzType="primary" nzSize="small" [disabled]="busy()" (click)="create.emit()">新建</button>
        }
      </div>

      @if (branches().length > 0) {
        <div class="branch-summary">{{ summaryText() }}</div>
        <div class="branch-list">
          @for (branch of branches(); track branch.id) {
            <article class="branch-card">
              <div class="branch-card__main">
                <div class="branch-card__head">
                  <div class="branch-card__title">{{ branch.title }}</div>
                  <app-status-badge [status]="branch.status" [label]="branchStatusLabel(branch.status)"></app-status-badge>
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
                  <button nz-button nzType="default" nzSize="small" [nzLoading]="busy()" (click)="startBranch.emit(branch.id)">
                    开始处理
                  </button>
                }
                @if (isMine(branch) && branch.status === 'in_progress') {
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
                  >
                    标记完成
                  </button>
                }
              </div>
              </div>
            </article>
          }
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .panel-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .branch-summary {
        padding: 12px 20px 0;
        color: var(--text-secondary);
        font-size: 12px;
      }
      .branch-list {
        display: grid;
        gap: 12px;
        padding: 12px 20px 18px;
      }
      .branch-card {
        display: grid;
        // grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        padding: 14px 16px;
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        background: var(--bg-subtle);
      }
      .branch-card__main {
        min-width: 0;
        display: grid;
        gap: 8px;
      }
      .branch-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .branch-card__title {
        min-width: 0;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 700;
        line-height: 1.5;
        flex: 1;
      }
      .branch-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .branch-card__owner {
        font-weight: 700;
        color: var(--primary-700);
      }
      .branch-card__summary {
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .branch-card__actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      // @media (max-width: 768px) {
      //   .branch-card {
      //     grid-template-columns: minmax(0, 1fr);
      //   }
      //   .branch-card__actions {
      //     justify-content: flex-start;
      //   }
      // }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueBranchesPanelComponent {
  readonly branches = input<IssueBranchEntity[]>([]);
  readonly currentActorIds = input<string[]>([]);
  readonly summaryText = input('当前没有协作分支');
  readonly canCreate = input(false);
  readonly canStartActions = input(false);
  readonly canStartOwn = input(false);
  readonly busy = input(false);

  readonly create = output<void>();
  readonly startOwn = output<void>();
  readonly startBranch = output<string>();
  readonly completeBranch = output<string>();

  isMine(branch: IssueBranchEntity): boolean {
    return this.currentActorIds().includes(branch.ownerUserId);
  }

  branchStatusLabel(status: IssueBranchEntity['status']): string {
    return (
      {
        todo: '待开始',
        in_progress: '处理中',
        done: '已完成',
      }[status] ?? status
    );
  }
}
