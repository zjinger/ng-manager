import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { RdMemberBlockEntity, RdStageTaskEntity } from '../../models/rd.model';

export interface RdProgressUpdateDialogSaveInput {
  progress: number;
  note: string;
  blockReason?: string;
  resolveBlockId?: string;
  stageTaskId?: string;
}

@Component({
  selector: 'app-rd-progress-update-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzSliderModule, NzSwitchModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="520"
      [title]="'更新我的进度'"
      [subtitle]="''"
      [icon]="'edit'"
      (cancel)="onCancel()"
    >
      <div dialog-body>
        <div class="progress-field">
          <label>成员</label>
          <div class="progress-field__member">{{ memberName() }}</div>
        </div>

        @if (stageTasks().length > 0) {
          <div class="progress-field">
            <label>对应阶段任务</label>
            <nz-select
              class="progress-field__select"
              nzPlaceHolder="选择本次更新对应的阶段任务"
              [ngModel]="selectedStageTaskId()"
              (ngModelChange)="onStageTaskChange($event)"
            >
              @for (task of stageTasks(); track task.id) {
                <nz-option [nzValue]="task.id" [nzLabel]="formatTaskOption(task)"></nz-option>
              }
            </nz-select>
          </div>
        }

        <div class="progress-field">
          <label>进度值</label>
          <div class="progress-field__slider">
            <nz-slider
              [nzMin]="0"
              [nzMax]="100"
              [nzStep]="1"
              [ngModel]="progressValue()"
              (ngModelChange)="onSliderChange($event)"
            ></nz-slider>
          </div>
          <div class="progress-field__value">{{ progressValue() }}%</div>
        </div>

        <div class="progress-field">
          <label>
            @if (blockEnabled()) {
              阻塞说明
              <span class="progress-field__required">必填</span>
            } @else {
              进度说明
              <span class="progress-field__optional">可选</span>
            }
          </label>
          <textarea
            nz-input
            rows="4"
            [placeholder]="blockEnabled() ? '请说明当前阻塞原因' : '例如：完成了核心模块开发，待联调测试...'"
            [ngModel]="description()"
            (ngModelChange)="description.set($event)"
          ></textarea>
        </div>

        <div class="progress-block">
          <div class="progress-block__header">
            <div>
              <span class="progress-block__label">执行状态</span>
              <strong>{{ blockEnabled() ? '标记为阻塞' : '当前无阻塞' }}</strong>
            </div>
            <nz-switch
              [ngModel]="blockEnabled()"
              [nzDisabled]="busy()"
              (ngModelChange)="onBlockSwitchChange($event)"
            ></nz-switch>
          </div>
          @if (activeBlock(); as block) {
            <div class="progress-block__hint">
              关闭开关并保存后，将解除当前阻塞。
            </div>
          } @else if (blockEnabled()) {
            <div class="progress-block__hint">
              阻塞状态表示成员当前无法继续执行后续任务,请务必填写阻塞原因以便相关人员了解情况并提供帮助。
            </div>
          } @else {
            <div class="progress-block__hint">
              如果当前处理受阻，打开开关并填写说明。
            </div>
          }
        </div>

        <div class="progress-tips">
          <span>仅允许更新自己的进度和执行状态</span>
        </div>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="onCancel()">取消</button>
          <button nz-button nzType="primary" [disabled]="!canSubmit()" [nzLoading]="busy()" (click)="onSubmit()">
            {{ submitButtonText() }}
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .progress-field {
        margin-bottom: 20px;
      }
      .progress-field label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      .progress-field__member {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-heading);
        padding: 8px 0;
      }
      .progress-field__select {
        width: 100%;
      }
      .progress-field__slider {
        padding: 0 8px;
      }
      .progress-field__value {
        text-align: center;
        font-size: 32px;
        font-weight: 800;
        color: var(--primary);
        margin-top: 12px;
      }
      .progress-field textarea {
        resize: vertical;
      }
      .progress-field__required,
      .progress-field__optional {
        font-size: 11px;
        font-weight: 600;
      }
      .progress-field__required {
        color: var(--danger, #dc2626);
      }
      .progress-field__optional {
        color: var(--text-muted);
      }
      .progress-block {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
        padding: 12px;
        margin-bottom: 16px;
      }
      .progress-block__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .progress-block__header > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .progress-block__label {
        font-size: 12px;
        color: var(--text-muted);
      }
      .progress-block__header strong {
        font-size: 14px;
        color: var(--text-heading);
      }
      .progress-block__hint {
        margin-top: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .progress-tips {
        padding: 12px 14px;
        background: var(--bg-subtle);
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdProgressUpdateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly memberName = input('');
  readonly memberId = input('');
  readonly currentProgress = input(0);
  readonly activeBlock = input<RdMemberBlockEntity | null>(null);
  readonly stageTasks = input<RdStageTaskEntity[]>([]);

  readonly save = output<RdProgressUpdateDialogSaveInput>();
  readonly cancel = output<void>();

  readonly progressValue = signal(0);
  readonly description = signal('');
  readonly blockEnabled = signal(false);
  readonly selectedStageTaskId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.progressValue.set(this.currentProgress());
      const activeBlock = this.activeBlock();
      this.description.set(activeBlock?.reason ?? '');
      this.blockEnabled.set(!!activeBlock);
      const tasks = this.stageTasks();
      const currentSelectedId = untracked(() => this.selectedStageTaskId());
      const nextSelectedId = this.pickDefaultStageTaskId(tasks, currentSelectedId);
      this.selectedStageTaskId.set(nextSelectedId);
      this.progressValue.set(this.resolveProgressForTask(nextSelectedId) ?? this.currentProgress());
    });
  }

  onSliderChange(value: number): void {
    this.progressValue.set(value);
  }

  onStageTaskChange(taskId: string | null): void {
    this.selectedStageTaskId.set(taskId);
    this.progressValue.set(this.resolveProgressForTask(taskId) ?? this.currentProgress());
  }

  onCancel(): void {
    this.cancel.emit();
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
    const ownerProgress = task.ownerProgresses?.find((owner) => owner.userId === this.memberId());
    if ((ownerProgress?.progress ?? task.progress ?? 0) <= 0) {
      return `${task.title}（待开始）`;
    }
    const status = ownerProgress?.status ?? task.status;
    return `${task.title}（${statusMap[status] ?? status}）`;
  }

  submitButtonText(): string {
    return this.isStartSubmit() ? '开始处理' : '保存进度';
  }

  private resolveProgressForTask(taskId: string | null): number | null {
    if (!taskId) {
      return null;
    }
    const task = this.stageTasks().find((item) => item.id === taskId);
    if (!task) {
      return null;
    }
    return task.ownerProgresses?.find((owner) => owner.userId === this.memberId())?.progress ?? task.progress ?? null;
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
    return task.ownerProgresses?.find((owner) => owner.userId === this.memberId())?.progress ?? task.progress ?? 0;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const activeBlock = this.activeBlock();
    const description = this.description().trim();
    this.save.emit({
      progress: this.isStartSubmit() ? 1 : this.progressValue(),
      note: this.blockEnabled() ? '' : description,
      blockReason: this.blockEnabled() && !activeBlock ? description : undefined,
      resolveBlockId: !this.blockEnabled() && activeBlock ? activeBlock.id : undefined,
      stageTaskId: this.selectedStageTaskId() ?? undefined,
    });
  }

  private isStartSubmit(): boolean {
    const selectedProgress = this.resolveProgressForTask(this.selectedStageTaskId());
    return !this.blockEnabled() && (selectedProgress ?? this.progressValue()) <= 0 && this.progressValue() <= 0;
  }
}
