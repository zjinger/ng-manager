import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UserStore } from '@app/core/stores';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { ProjectMemberEntity } from '@models/project.model';
import {
  RdItemEntity,
  RdItemProgress,
  RdMemberBlockEntity,
  RdStageEntity,
  RdStageTaskEntity,
  resolveRdStageKey,
} from '@pages/rd/models/rd.model';
import { RdPermissionService } from '@pages/rd/services/rd-permission.service';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzProgressModule } from 'ng-zorro-antd/progress';

@Component({
  selector: 'app-rd-progress-area',
  imports: [
    NzAvatarModule,
    NzButtonModule,
    NzProgressModule,
    NzPopoverModule,
    NzPopconfirmModule,
    DetailItemCardComponent,
    CommonModule,
  ],
  template: `
    <app-detail-item-card title="成员进度">
      <div class="main-progress-header">
        <div class="main-progress-info">
          <span class="main-progress-label">整体进度</span>
          <span class="main-progress-hint">自动取成员平均值</span>
        </div>
        <div class="main-progress-data">{{ mainProgress() }}%</div>
      </div>
      <div class="progress-bar">
        <nz-progress
          [nzPercent]="mainProgress()"
          [nzShowInfo]="false"
          [nzStrokeColor]="{ '0%': '#108ee9', '100%': '#87d068' }"
        ></nz-progress>
      </div>
      <div class="progress-list">
        @for (item of normalizedProgressList(); track item.id) {
          <div class="progress-item">
            <div class="progress-item-header">
              <nz-avatar
                [nzSize]="'small'"
                [nzText]="item.userName?.charAt(0)"
                [style.background-color]="'#1890ff'"
              ></nz-avatar>
              <div class="member-info">
                <span class="member-name">
                  {{ item.userName }}
                  @if (item.userId === currentUserId()) {
                    (我)
                  }
                </span>
                <span class="member-hint">
                  最后更新：{{ item.updatedAt | date: 'MM:dd hh:mm' }}
                </span>
              </div>
              <nz-progress [nzPercent]="item.progress"></nz-progress>
            </div>
            <div class="progress-item-footer">
              @if (item.note) {
                <div class="note-row">
                  <span class="note-label">进度说明：</span>
                  <span class="note">{{ item.note }}</span>
                </div>
              }
              @if (stageTaskHintsFor(item).length > 0) {
                <div class="task-row">
                  <span class="task-label">当前任务：</span>
                  <div class="task-list">
                    @for (task of stageTaskHintsFor(item); track task.id) {
                      <span
                        class="task-chip"
                        [class.task-chip--cancelled]="isStageTaskAssignmentCancelled(item, task)"
                      >
                        <span class="task-title">{{ task.title }}</span>
                        @if (formatStageTaskPlanRange(task); as range) {
                          <span class="task-plan">{{ range }}</span>
                        }
                        @if (stageTaskHintsFor(item).length > 1) {
                          <span class="task-progress">{{ stageTaskProgressFor(item, task) }}%</span>
                        }
                      </span>
                    }
                  </div>
                </div>
              }
              @if (activeBlockFor(item.userId); as block) {
                <div class="block-row">
                  <span class="block-label">阻塞原因：</span>
                  <span class="block-reason">{{ block.reason }}</span>
                </div>
              }
              <div class="progress-item-actions">
                @if (activeBlockFor(item.userId); as block) {
                  @if (canUpdateProgress(item) && !isProgressLocked()) {
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
                } @else if (canUpdateProgress(item) && !isProgressLocked()) {
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
                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      (click)="onUpdateProgress(item)"
                    >
                      更新
                    </button>
                  }
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty">暂无成员进度数据</div>
        }
      </div>
    </app-detail-item-card>
  `,
  styleUrl: './rd-progress-area.component.less',
})
export class RdProgressAreaComponent {
  private rdPermission = inject(RdPermissionService);
  private userStore = inject(UserStore);
  readonly item = input<RdItemEntity | null>(null);
  readonly progressList = input<RdItemProgress[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly memberBlocks = input<RdMemberBlockEntity[]>([]);
  readonly updateProgressClick = output<RdItemProgress>();
  readonly resolveMemberBlockClick = output<{ blockId: string }>();
  readonly startTaskChoiceUserId = signal<string | null>(null);

  readonly currentUserId = computed(() => this.userStore.currentUserId());

  readonly canResolveMemberBlocks = computed(() =>
    this.rdPermission.canVerify(
      this.item(),
      this.userStore.currentUserId(),
      this.members(),
    ),
  );

  readonly normalizedProgressList = computed<RdItemProgress[]>(() => {
    const currentRdItem = this.item();
    if (!currentRdItem) return [];
    const memberIds = currentRdItem.memberIds ?? [];
    const memberNameMap = new Map(
      this.members().map((member) => [member.userId, member.displayName]),
    );
    const progressMap = new Map(this.progressList().map((progress) => [progress.userId, progress]));
    const normalizedList = [];
    // 老版本兼容
    if (!memberIds.length) {
      if (!currentRdItem.assigneeId) return [];
      normalizedList.push({
        id: '',
        itemId: currentRdItem.id,
        userId: currentRdItem.assigneeId,
        userName:
          currentRdItem.assigneeName ??
          memberNameMap.get(currentRdItem.assigneeId) ??
          currentRdItem.assigneeId,
        progress: currentRdItem.progress,
        note: '',
        updatedAt: currentRdItem.updatedAt,
      });
    } else {
      const list = memberIds.map((memberId) => {
        return {
          id: memberId,
          itemId: progressMap.get(memberId)?.itemId ?? currentRdItem.id,
          userId: memberId,
          userName: progressMap.get(memberId)?.userName ?? memberNameMap.get(memberId) ?? memberId,
          progress: progressMap.get(memberId)?.progress ?? 0,
          note: progressMap.get(memberId)?.note ?? '',
          updatedAt: currentRdItem.updatedAt,
        };
      });
      normalizedList.push(...list);
    }

    const currentId = this.currentUserId();

    return normalizedList.sort((a, b) => {
      if (a.userId === currentId) return -1;
      if (b.userId === currentId) return 1;
      return 0;
    });
  });

  readonly mainProgress = computed(() => this.item()?.progress ?? 0);

  activeBlocks(): RdMemberBlockEntity[] {
    return this.memberBlocks().filter((block) => block.status === 'active');
  }

  activeBlockFor(userId: string): RdMemberBlockEntity | null {
    return this.activeBlocks().find((block) => block.userId === userId) ?? null;
  }

  stageTaskHintsFor(member: RdItemProgress): RdStageTaskEntity[] {
    const id = member.userId?.trim() ?? '';
    const name = member.userName?.trim() ?? '';
    if (!id && !name) {
      return [];
    }
    return this.stageTasks()
      .filter((task) => task.status !== 'cancelled')
      .filter((task) => this.isCurrentStageTask(task))
      .filter((task) => this.stageTaskOwnerFor(member, task) !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }

  stageTaskProgressFor(member: RdItemProgress, task: RdStageTaskEntity): number {
    const ownerProgress = this.stageTaskOwnerFor(member, task);
    return Math.max(0, Math.min(100, ownerProgress?.progress ?? task.progress ?? 0));
  }

  isStageTaskAssignmentCancelled(member: RdItemProgress, task: RdStageTaskEntity): boolean {
    return this.stageTaskOwnerFor(member, task)?.status === 'cancelled';
  }

  formatStageTaskPlanRange(task: RdStageTaskEntity): string {
    const start = this.formatDateOnly(task.plannedStartAt);
    const end = this.formatDateOnly(task.plannedEndAt);
    if (start && end) {
      return `${start}~${end}`;
    }
    return start || end || '';
  }

  startableStageTasksFor(member: RdItemProgress): RdStageTaskEntity[] {
    return this.stageTaskHintsFor(member).filter(
      (task) => !this.isStageTaskAssignmentCancelled(member, task) && this.stageTaskProgressFor(member, task) <= 0,
    );
  }

  startTaskConfirmPrompt(member: RdItemProgress): string {
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

  onUpdateProgress(item: RdItemProgress): void {
    this.updateProgressClick.emit(item);
  }

  onStartProgress(item: RdItemProgress, stageTaskId?: string): void {
    const taskId = stageTaskId || this.startableStageTasksFor(item)[0]?.id;
    this.startTaskChoiceUserId.set(null);
    this.updateProgressClick.emit({
      ...item,
      progress: 1,
      stageTaskId: taskId,
    });
  }

  onContinueProcessing(blockId: string): void {
    if (this.isProgressLocked()) {
      return;
    }
    this.resolveMemberBlockClick.emit({ blockId });
  }

  isProgressLocked(): boolean {
    const status = this.item()?.status;
    return status === 'accepted' || status === 'closed';
  }

  canUpdateProgress(item: RdItemProgress): boolean {
    return (
      item.userId === this.currentUserId() &&
      this.rdPermission.hasPermissionToTransition(this.userStore.currentUser())
    );
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

  private stageTaskOwnerFor(
    member: RdItemProgress,
    task: RdStageTaskEntity,
  ): RdStageTaskEntity['ownerProgresses'][number] | null {
    const id = member.userId?.trim() ?? '';
    const name = member.userName?.trim() ?? '';
    const ownerProgress = task.ownerProgresses?.find(
      (owner) => (!!id && owner.userId === id) || (!!name && owner.userName === name),
    );
    if (ownerProgress) {
      return ownerProgress;
    }
    const ownerIds = task.ownerIds ?? [];
    const ownerNames = task.ownerNames ?? [];
    if (
      (!!id && (ownerIds.includes(id) || task.ownerId === id)) ||
      (!!name && (ownerNames.includes(name) || task.ownerName === name))
    ) {
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
}