import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { PanelCardComponent } from '@shared/ui';
import { resolveRdStageKey, type RdItemEntity, type RdItemProgress, type RdMemberBlockEntity, type RdStageEntity, type RdStageTaskEntity } from '../../models/rd.model';

export interface MemberProgressItem extends RdItemProgress {
  memberName: string;
  isCurrentUser: boolean;
  isActiveMember: boolean;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-rd-progress-panel',
  standalone: true,
  imports: [PanelCardComponent, NzButtonModule, NzAvatarModule, NzPopconfirmModule],
  template: `
    <app-panel-card title="成员进度">
      <div class="progress-hero">
        <div class="progress-hero__info">
          <span class="progress-hero__label">整体进度</span>
          <span class="progress-hero__hint">有阶段任务时按人-任务进度平均汇总</span>
        </div>
        <div class="progress-hero__value">{{ mainProgress() }}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill" [style.width.%]="mainProgress()"></div>
      </div>

      @if (activeBlocks().length > 0) {
        <div class="block-alert">
          <strong>{{ activeBlocks().length }} 名成员存在阻塞</strong>
          <span>阻塞不会改变研发项整体状态，但推进下一阶段前建议确认。</span>
        </div>
      }

      <div class="member-list">
        @for (item of memberProgressList(); track item.userId) {
          <div class="member-item">
            <div class="member-item__main">
              <div class="member-item__left">
                <nz-avatar
                  [class.member-item__avatar--default]="!item.avatarUrl"
                  [nzSize]="32"
                  nzShape="circle"
                  [nzSrc]="item.avatarUrl || undefined"
                  [nzText]="getAvatarLetter(item.memberName)"
                ></nz-avatar>
                <div class="member-item__info">
                  <span class="member-item__name">
                    {{ item.memberName }}
                    @if (item.isCurrentUser) {
                      <span class="member-item__me-tag">我</span>
                    }
                    @if (!item.isActiveMember) {
                      <span class="member-item__removed-tag">已移除</span>
                    }
                  </span>
                  <span class="member-item__time">最后更新：{{ formatTime(item.updatedAt) }}</span>
                </div>
              </div>
              <div class="member-item__right">
                <div class="progress-bar progress-bar--small">
                  <div class="progress-bar__fill" [style.width.%]="item.progress"></div>
                </div>
                <div class="member-item__actions">
                  <strong>{{ item.progress }}%</strong>
                  @if (activeBlockFor(item.userId); as block) {
                    @if (item.isActiveMember && item.isCurrentUser && !isProgressLocked()) {
                      <button nz-button nzType="default" nzSize="small" (click)="onContinueProcessing(block.id)">
                        继续处理
                      </button>
                    } @else if (canResolveMemberBlocks() && !isProgressLocked()) {
                      <button
                        nz-button
                        nzType="default"
                        nzSize="small"
                        nz-popconfirm
                        nzPopconfirmTitle="确认解除该成员阻塞吗？"
                        nzPopconfirmPlacement="topRight"
                        (nzOnConfirm)="resolveMemberBlockClick.emit({ blockId: block.id })"
                      >
                        解除阻塞
                      </button>
                    }
                  } @else if (item.isActiveMember && item.isCurrentUser && !isProgressLocked()) {
                    @if (item.progress <= 0) {
                      @if (startableStageTasksFor(item).length > 1) {
                        <ng-template #startTaskChoiceTpl>
                          <div class="start-task-choice">
                            <div class="start-task-choice__title">选择要开始的阶段任务</div>
                            <div class="start-task-choice__list">
                              @for (task of startableStageTasksFor(item); track task.id) {
                                <button
                                  nz-button
                                  nzType="text"
                                  class="start-task-choice__item"
                                  (click)="onStartProgress(item, task.id)"
                                >
                                  {{ task.title }}
                                </button>
                              }
                            </div>
                          </div>
                        </ng-template>
                        <button
                          nz-button
                          nzType="default"
                          nzSize="small"
                          nz-popconfirm
                          [nzPopconfirmTitle]="startTaskChoiceTpl"
                          nzPopconfirmOverlayClassName="rd-start-task-popconfirm"
                          nzPopconfirmPlacement="topRight"
                          [nzPopconfirmVisible]="startTaskChoiceUserId() === item.userId"
                          (nzPopconfirmVisibleChange)="onStartTaskChoiceVisibleChange(item.userId, $event)"
                        >
                          开始
                        </button>
                      } @else {
                        <button
                          nz-button
                          nzType="default"
                          nzSize="small"
                          nz-popconfirm
                          [nzPopconfirmTitle]="startTaskConfirmPrompt(item)"
                          nzPopconfirmPlacement="topRight"
                          (nzOnConfirm)="onStartProgress(item)"
                        >
                          开始
                        </button>
                      }
                    } @else {
                      <button nz-button nzType="default" nzSize="small" (click)="onUpdateProgress(item)">更新</button>
                    }
                  }
                </div>
              </div>
            </div>
            @if (item.note) {
              <div class="member-item__note-row">
                <span class="member-item__note-label">进度说明：</span>
                <span class="member-item__note">{{ item.note }}</span>
              </div>
            }
            @if (stageTaskHintsFor(item).length > 0) {
              <div class="member-item__task-row">
                <span class="member-item__task-label">当前任务：</span>
                <div class="member-item__task-list">
                  @for (task of stageTaskHintsFor(item); track task.id) {
                    <span
                      class="member-item__task-chip"
                      [class.member-item__task-chip--cancelled]="isStageTaskAssignmentCancelled(item, task)"
                    >
                      <span class="member-item__task-title">{{ task.title }}</span>
                      @if (formatStageTaskPlanRange(task); as range) {
                        <span class="member-item__task-plan">{{ range }}</span>
                      }
                      @if (stageTaskHintsFor(item).length > 1) {
                        <span class="member-item__task-progress">{{ stageTaskProgressFor(item, task) }}%</span>
                      }
                    </span>
                  }
                </div>
              </div>
            }
            @if (activeBlockFor(item.userId); as block) {
              <div class="member-item__block-row">
                <span class="member-item__block-label">阻塞原因：</span>
                <span class="member-item__block-reason">{{ block.reason }}</span>
              </div>
            }
          </div>
        } @empty {
          <div class="member-list__empty">暂无成员进度数据</div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .progress-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 16px 20px 12px;
      }
      .progress-hero__info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .progress-hero__label {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-heading);
      }
      .progress-hero__hint {
        font-size: 12px;
        color: var(--text-muted);
      }
      .progress-hero__value {
        font-size: 28px;
        font-weight: 800;
        color: var(--primary);
      }
      .progress-bar {
        height: 8px;
        background: var(--gray-100);
        border-radius: 999px;
        overflow: hidden;
        margin: 0 20px 16px;
      }
      .progress-bar--small {
        height: 6px;
        width: 100px;
        margin: 0;
      }
      .progress-bar__fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-500, #4f46e5), var(--primary-400, #6366f1));
        border-radius: 999px;
        transition: width 0.3s ease;
      }
      .block-alert {
        margin: 0 20px 14px;
        border: 1px solid rgba(245, 158, 11, 0.32);
        background: rgba(245, 158, 11, 0.08);
        color: rgb(180, 83, 9);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
      }
      .block-alert strong {
        font-size: 13px;
      }
      .member-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0 20px 16px;
      }
      .member-list__empty {
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .member-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-subtle);
      }
      .member-item__main {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .member-item__left {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }
      .member-item__info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .member-item__name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-heading);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .member-item__avatar--default{
        background: linear-gradient( 135deg, var(--primary-500), var(--primary-700));
      }
      .member-item__me-tag {
        font-size: 10px;
        background: var(--success-bg);
        color: var(--success);
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 600;
      }
      .member-item__removed-tag {
        font-size: 10px;
        background: var(--gray-100);
        color: var(--text-muted);
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 600;
      }
      .member-item__time {
        font-size: 12px;
        color: var(--text-muted);
      }
      .member-item__note {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .member-item__right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .member-item__actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .member-item__actions strong {
        font-size: 14px;
        color: var(--text-heading);
        min-width: 36px;
        text-align: right;
      }
      .member-item__note-row,
      .member-item__task-row {
        width: 100%;
        border-top: 1px dashed var(--border-color-soft);
        display: flex;
        gap: 4px;
      }
      .member-item__block-row {
        width: 100%;
        border-top: 1px dashed rgba(245, 158, 11, 0.32);
        padding-top: 8px;
        display: flex;
        gap: 4px;
      }
      .member-item__note-label {
        flex: 0 0 auto;
        font-size: 12px;
        color: var(--text-muted);
      }
      .member-item__task-label {
        flex: 0 0 auto;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 24px;
      }
      .member-item__task-list {
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .member-item__task-chip {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        padding: 3px 8px;
        border: 1px solid var(--border-color-soft);
        border-radius: 999px;
        background: var(--bg-container);
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 16px;
      }
      .member-item__task-chip--cancelled {
        border-color: rgba(239, 68, 68, 0.28);
        background: rgba(239, 68, 68, 0.08);
        color: var(--danger, #ef4444);
        text-decoration: line-through;
      }
      .member-item__task-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-item__task-plan {
        color: var(--text-muted);
        flex: 0 0 auto;
      }
      .member-item__task-progress {
        color: var(--primary);
        font-weight: 700;
        flex: 0 0 auto;
      }
      .member-item__task-chip--cancelled .member-item__task-plan,
      .member-item__task-chip--cancelled .member-item__task-progress {
        color: inherit;
      }
      .member-item__block-label {
        flex: 0 0 auto;
        font-size: 12px;
        color: rgb(180, 83, 9);
      }
      .member-item__block-reason {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      :host-context(html[data-theme='dark']) .block-alert,
      :host-context(html[data-theme='dark']) .member-item__block-row {
        border-color: rgba(251, 191, 36, 0.35);
      }
      :host-context(html[data-theme='dark']) .block-alert {
        background: rgba(251, 191, 36, 0.12);
        color: rgb(253, 230, 138);
      }
      :host-context(html[data-theme='dark']) .member-item__block-label {
        color: rgb(253, 230, 138);
      }
      .start-task-choice {
        width: 220px;
      }
      .start-task-choice__title {
        margin-bottom: 8px;
        color: var(--text-heading);
        font-size: 13px;
        font-weight: 700;
      }
      .start-task-choice__list {
        display: grid;
        gap: 4px;
      }
      .start-task-choice__item {
        width: 100%;
        min-width: 0;
        justify-content: flex-start;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      ::ng-deep .rd-start-task-popconfirm .ant-popover-buttons {
        display: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdProgressPanelComponent {
  readonly item = input<RdItemEntity | null>(null);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly memberBlocks = input<RdMemberBlockEntity[]>([]);
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly canResolveMemberBlocks = input(false);
  readonly currentUserId = input<string>('');

  readonly updateProgressClick = output<{ userId: string; memberName: string; currentProgress: number; quickStart?: boolean; stageTaskId?: string }>();
  readonly resolveMemberBlockClick = output<{ blockId: string }>();
  readonly startTaskChoiceUserId = signal<string | null>(null);

  activeBlocks(): RdMemberBlockEntity[] {
    return this.memberBlocks().filter((block) => block.status === 'active');
  }

  activeBlockFor(userId: string): RdMemberBlockEntity | null {
    return this.activeBlocks().find((block) => block.userId === userId) ?? null;
  }

  stageTaskHintsFor(member: MemberProgressItem): RdStageTaskEntity[] {
    const id = member.userId.trim();
    const name = member.memberName.trim();
    if (!id && !name) {
      return [];
    }
    return this.stageTasks()
      .filter((task) => task.status !== 'cancelled')
      .filter((task) => this.isCurrentStageTask(task))
      .filter((task) => this.stageTaskOwnerFor(member, task) !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }

  mainProgress(): number {
    return this.item()?.progress ?? 0;
  }

  isProgressLocked(): boolean {
    const status = this.item()?.status;
    return status === 'accepted' || status === 'closed';
  }

  getAvatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  formatTime(isoString: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatStageTaskPlanRange(task: RdStageTaskEntity): string {
    const start = this.formatDateOnly(task.plannedStartAt);
    const end = this.formatDateOnly(task.plannedEndAt);
    if (start && end) {
      return `${start}~${end}`;
    }
    return start || end || '';
  }

  private isCurrentStageTask(task: RdStageTaskEntity): boolean {
    const item = this.item();
    if (!item?.stageId) {
      return true;
    }
    const currentStage = this.stages().find((stage) => stage.id === item.stageId);
    const currentStageKey = currentStage ? resolveRdStageKey(currentStage) : '';
    return !currentStageKey || task.stageKey === currentStageKey;
  }

  stageTaskProgressFor(member: MemberProgressItem, task: RdStageTaskEntity): number {
    const ownerProgress = this.stageTaskOwnerFor(member, task);
    return Math.max(0, Math.min(100, ownerProgress?.progress ?? task.progress ?? 0));
  }

  startableStageTasksFor(member: MemberProgressItem): RdStageTaskEntity[] {
    return this.stageTaskHintsFor(member).filter(
      (task) => !this.isStageTaskAssignmentCancelled(member, task) && this.stageTaskProgressFor(member, task) <= 0,
    );
  }

  startTaskConfirmPrompt(member: MemberProgressItem): string {
    const task = this.startableStageTasksFor(member)[0];
    return task ? `确认开始处理阶段任务「${task.title}」吗？` : '确认开始处理该研发项吗？';
  }

  onStartTaskChoiceVisibleChange(userId: string, visible: boolean): void {
    if (visible) {
      this.startTaskChoiceUserId.set(userId);
      return;
    }
    if (this.startTaskChoiceUserId() === userId) {
      this.startTaskChoiceUserId.set(null);
    }
  }

  private formatDateOnly(value: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  }

  onUpdateProgress(item: MemberProgressItem): void {
    if (this.isProgressLocked() || !item.isActiveMember || !item.isCurrentUser) {
      return;
    }
    this.updateProgressClick.emit({
      userId: item.userId,
      memberName: item.memberName,
      currentProgress: item.progress,
    });
  }

  onContinueProcessing(blockId: string): void {
    if (this.isProgressLocked()) {
      return;
    }
    this.resolveMemberBlockClick.emit({ blockId });
  }

  onStartProgress(item: MemberProgressItem, stageTaskId?: string): void {
    if (this.isProgressLocked() || !item.isActiveMember || !item.isCurrentUser) {
      return;
    }
    const taskId = stageTaskId || this.startableStageTasksFor(item)[0]?.id;
    this.startTaskChoiceUserId.set(null);
    this.updateProgressClick.emit({
      userId: item.userId,
      memberName: item.memberName,
      currentProgress: 1,
      quickStart: true,
      stageTaskId: taskId,
    });
  }

  isStageTaskAssignmentCancelled(member: MemberProgressItem, task: RdStageTaskEntity): boolean {
    return this.stageTaskOwnerFor(member, task)?.status === 'cancelled';
  }

  private stageTaskOwnerFor(member: MemberProgressItem, task: RdStageTaskEntity): RdStageTaskEntity['ownerProgresses'][number] | null {
    const id = member.userId.trim();
    const name = member.memberName.trim();
    const ownerProgress = task.ownerProgresses?.find(
      (owner) => (!!id && owner.userId === id) || (!!name && owner.userName === name),
    );
    if (ownerProgress) {
      return ownerProgress;
    }
    const ownerIds = task.ownerIds ?? [];
    const ownerNames = task.ownerNames ?? [];
    if ((!!id && (ownerIds.includes(id) || task.ownerId === id)) || (!!name && (ownerNames.includes(name) || task.ownerName === name))) {
      return {
        id: '',
        taskId: task.id,
        projectId: task.projectId,
        itemId: task.itemId,
        userId: id,
        userName: name,
        status: task.status,
        progress: task.progress,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }
    return null;
  }
}
