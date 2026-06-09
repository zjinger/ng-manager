import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RdItemEntity,
  RdItemProgress,
  RdMemberBlockEntity,
  RdStageEntity,
  RdStageTaskEntity,
  resolveRdStageKey,
} from '@pages/rd/models/rd.model';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

export interface RdProgressDialogSaveInput {
  progress: number;
  note: string;
  blockReason?: string;
  resolveBlockId?: string;
  stageTaskId?: string;
}

@Component({
  selector: 'app-rd-progress-dialog',
  imports: [
    NzModalModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzSliderModule,
    NzAlertModule,
    NzIconModule,
    NzSelectModule,
    NzSwitchModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzWidth]="600"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      (nzOnCancel)="cancel.emit()"
    >
      <!-- title -->
      <div *nzModalTitle>
        <div class="modal-title">
          <span>更新我的进度</span>
          <div class="modal-subtitle">
            {{ rdItem() ? rdItem()!.title : '' }}
          </div>
        </div>
      </div>

      <!-- content -->
      <ng-container *nzModalContent>
        <div class="progress-form">
          <!-- 成员 -->
          <div class="field">
            <div class="label">成员</div>
            <div class="value">{{ memberName() || progress()?.userName || '_ _' }}</div>
          </div>

          <!-- 阶段任务 -->
          @if (filteredStageTasks().length > 0) {
            <div class="field">
              <div class="label">对应阶段任务</div>
              <nz-select
                class="task-select"
                nzPlaceHolder="选择本次更新对应的阶段任务"
                [ngModel]="selectedStageTaskId()"
                (ngModelChange)="onStageTaskChange($event)"
              >
                @for (task of filteredStageTasks(); track task.id) {
                  <nz-option [nzValue]="task.id" [nzLabel]="formatTaskOption(task)"></nz-option>
                }
              </nz-select>
            </div>
          }

          <!-- 进度 -->
          <div class="field">
            <div class="label">进度值</div>

            <nz-slider
              [ngModel]="progressDraft()"
              (ngModelChange)="progressDraft.set($event)"
              [nzMin]="0"
              [nzMax]="100"
            ></nz-slider>

            <div class="progress-value">{{ progressDraft() }}%</div>
          </div>

          <!-- 说明 -->
          <div class="field">
            <div class="label">
              @if (blockEnabled()) {
                阻塞说明
                <span class="label-required">必填</span>
              } @else {
                进度说明
                <span class="label-optional">可选</span>
              }
            </div>
            <textarea
              nz-input
              rows="4"
              [placeholder]="blockEnabled() ? '请说明当前阻塞原因' : '例如：完成了核心模块开发，待联调测试...'"
              [ngModel]="description()"
              (ngModelChange)="description.set($event)"
            ></textarea>
          </div>

          <!-- 阻塞状态 -->
          <div class="block-section">
            <div class="block-header">
              <div>
                <span class="block-label">执行状态</span>
                <strong>{{ blockEnabled() ? '标记为阻塞' : '当前无阻塞' }}</strong>
              </div>
              <nz-switch
                [ngModel]="blockEnabled()"
                [nzDisabled]="busy()"
                (ngModelChange)="onBlockSwitchChange($event)"
              ></nz-switch>
            </div>
            @if (activeBlock(); as block) {
              <div class="block-hint">
                关闭开关并保存后，将解除当前阻塞。
              </div>
            } @else if (blockEnabled()) {
              <div class="block-hint">
                阻塞状态表示成员当前无法继续执行后续任务，阻塞不会改变研发项整体状态，但推进下一阶段前建议确认。
              </div>
            } @else {
              <div class="block-hint">
                如果当前处理受阻，打开开关并填写说明。
              </div>
            }
          </div>

          <!-- 提示 -->
          <nz-alert nzType="info" [nzMessage]="alertInfoTemplate" />
          <ng-template #alertInfoTemplate>
            <div class="hint"><nz-icon nzType="bulb" nzTheme="fill" /> 仅允许更新自己的进度和执行状态</div>
          </ng-template>
        </div>
      </ng-container>

      <!-- footer -->
      <ng-container *nzModalFooter>
        <button nz-button (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!canSubmit()" [nzLoading]="busy()" (click)="submitForm()">
          {{ submitButtonText() }}
        </button>
      </ng-container>
    </nz-modal>
  `,
  styles: `
    .modal-title {
      font-size: 16px;
      font-weight: 600;
    }
    .modal-subtitle {
      color: #999;
      font-size: 14px;
      line-height: 20px;
    }
    .progress-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: #8c8c8c;
    }

    .label-required {
      font-size: 11px;
      font-weight: 600;
      color: #dc2626;
    }

    .label-optional {
      font-size: 11px;
      font-weight: 600;
      color: #8c8c8c;
    }

    .value {
      font-size: 1rem;
      font-weight: 500;
      color: #262626;
    }

    .task-select {
      width: 100%;
    }

    .progress-value {
      text-align: center;
      font-size: 28px;
      font-weight: 600;
      color: #262626;
      margin-top: 8px;
    }

    textarea {
      border-radius: 8px;
    }

    .hint {
      font-size: 12px;
      color: #8c8c8c;
    }

    ::ng-deep .ant-alert-info {
      border-radius: 8px;
    }

    .block-section {
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      background: #fafafa;
      padding: 12px;
    }

    .block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .block-header > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .block-label {
      font-size: 12px;
      color: #8c8c8c;
    }

    .block-header strong {
      font-size: 14px;
      color: #262626;
    }

    .block-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #8c8c8c;
    }
  `,
})
export class RdProgressDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);

  readonly progress = input<RdItemProgress | null>(null);
  readonly rdItem = input<RdItemEntity | null>(null);
  readonly memberName = input('');
  readonly memberId = input('');
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly activeBlock = input<RdMemberBlockEntity | null>(null);

  readonly confirm = output<RdProgressDialogSaveInput>();

  readonly cancel = output<void>();

  readonly filteredStageTasks = computed(() => {
    const memberId = this.memberId().trim();
    const memberName = this.memberName().trim();
    const rdItem = this.rdItem();
    if (!memberId && !memberName) {
      return [];
    }
    return this.stageTasks()
      .filter((task) => task.status !== 'cancelled')
      .filter((task) => this.isCurrentStageTask(task, rdItem))
      .filter((task) => this.isTaskAssignedToMember(task, memberId, memberName))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  });

  readonly progressDraft = signal(0);
  readonly description = signal('');
  readonly blockEnabled = signal(false);
  readonly selectedStageTaskId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const currentProgress = this.progress()?.progress || 0;
      const block = this.activeBlock();
      this.description.set(block?.reason ?? '');
      this.blockEnabled.set(!!block);

      const tasks = this.filteredStageTasks();
      const currentSelectedId = untracked(() => this.selectedStageTaskId());
      const nextSelectedId = this.pickDefaultStageTaskId(tasks, currentSelectedId);
      this.selectedStageTaskId.set(nextSelectedId);
      this.progressDraft.set(this.resolveProgressForTask(nextSelectedId) ?? currentProgress);
    });
  }

  onSliderChange(value: number): void {
    this.progressDraft.set(value);
  }

  onStageTaskChange(taskId: string | null): void {
    this.selectedStageTaskId.set(taskId);
    this.progressDraft.set(this.resolveProgressForTask(taskId) ?? this.progress()?.progress ?? 0);
  }

  onBlockSwitchChange(value: boolean): void {
    this.blockEnabled.set(value);
  }

  canSubmit(): boolean {
    if (this.busy()) {
      return false;
    }
    return !this.blockEnabled() || !!this.description().trim();
  }

  formatTaskOption(task: RdStageTaskEntity): string {
    const statusMap: Record<RdStageTaskEntity['status'], string> = {
      pending: '待开始',
      in_progress: '进行中',
      done: '已完成',
      blocked: '阻塞',
      cancelled: '已取消',
    };
    const memberId = this.memberId();
    const ownerProgress = task.ownerProgresses?.find((owner) => owner.userId === memberId);
    if ((ownerProgress?.progress ?? task.progress ?? 0) <= 0) {
      return `${task.title}（待开始）`;
    }
    const status = ownerProgress?.status ?? task.status;
    return `${task.title}（${statusMap[status] ?? status}）`;
  }

  submitButtonText(): string {
    return this.isStartSubmit() ? '开始处理' : '保存进度';
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const block = this.activeBlock();
    const desc = this.description().trim();
    this.confirm.emit({
      progress: this.isStartSubmit() ? 1 : this.progressDraft(),
      note: this.blockEnabled() ? '' : desc,
      blockReason: this.blockEnabled() && !block ? desc : undefined,
      resolveBlockId: !this.blockEnabled() && block ? block.id : undefined,
      stageTaskId: this.selectedStageTaskId() ?? undefined,
    });
  }

  private isStartSubmit(): boolean {
    const selectedProgress = this.resolveProgressForTask(this.selectedStageTaskId());
    return !this.blockEnabled() && (selectedProgress ?? this.progressDraft()) <= 0 && this.progressDraft() <= 0;
  }

  private resolveProgressForTask(taskId: string | null): number | null {
    if (!taskId) {
      return null;
    }
    const task = this.stageTasks().find((item) => item.id === taskId);
    if (!task) {
      return null;
    }
    const memberId = this.memberId();
    return task.ownerProgresses?.find((owner) => owner.userId === memberId)?.progress ?? task.progress ?? null;
  }

  private isCurrentStageTask(task: RdStageTaskEntity, rdItem: RdItemEntity | null): boolean {
    if (!rdItem?.stageId) {
      return true;
    }
    const currentStage = this.stages().find((stage) => stage.id === rdItem.stageId);
    const currentStageKey = currentStage ? resolveRdStageKey(currentStage) : '';
    return !currentStageKey || task.stageKey === currentStageKey;
  }

  private isTaskAssignedToMember(task: RdStageTaskEntity, memberId: string, memberName: string): boolean {
    // Check ownerProgresses first
    if (task.ownerProgresses?.some(
      (owner) => (!!memberId && owner.userId === memberId) || (!!memberName && owner.userName === memberName),
    )) {
      return true;
    }
    // Fallback to ownerIds/ownerNames
    const ownerIds = task.ownerIds ?? [];
    const ownerNames = task.ownerNames ?? [];
    return (
      (!!memberId && (ownerIds.includes(memberId) || task.ownerId === memberId)) ||
      (!!memberName && (ownerNames.includes(memberName) || task.ownerName === memberName))
    );
  }

  private pickDefaultStageTaskId(tasks: RdStageTaskEntity[], currentSelectedId: string | null): string | null {
    const currentTask = tasks.find((task) => task.id === currentSelectedId);
    if (currentTask && this.resolveTaskProgress(currentTask) < 100) {
      return currentTask.id;
    }
    const unfinishedTask = tasks.find((task) => this.resolveTaskProgress(task) < 100);
    return unfinishedTask?.id ?? tasks[0]?.id ?? null;
  }

  private resolveTaskProgress(task: RdStageTaskEntity): number {
    const memberId = this.memberId();
    return task.ownerProgresses?.find((owner) => owner.userId === memberId)?.progress ?? task.progress ?? 0;
  }
}