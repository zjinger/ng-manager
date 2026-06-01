import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';

import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdStageTaskTemplateEntity } from '../../models/rd.model';

type TaskPlanKey = 'start' | 'end';

@Component({
  selector: 'app-rd-member-stage-task-picker',
  standalone: true,
  imports: [FormsModule, NzAutocompleteModule, NzDatePickerModule, NzInputModule],
  template: `
    <div class="template-preview">
      <div class="template-preview__header">
        <div>
          <span>{{ helperText() }}</span>
        </div>
        <span>将创建 {{ taskCount() }} 个任务</span>
      </div>

      @if (members().length > 0) {
        <div class="template-preview__list">
          @for (member of members(); track member.userId) {
            <div class="template-preview__item">
              <span class="template-preview__owner">{{ member.displayName }}</span>
              <div class="template-preview__task-input">
                <input
                  nz-input
                  class="template-preview__title-input"
                  [class.template-preview__title-input--error]="titleErrors()[member.userId]"
                  maxlength="200"
                  [nzAutocomplete]="taskTitleAuto"
                  [ngModel]="taskTitle(member.userId)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="taskTitleChange.emit({ userId: member.userId, value: $event })"
                  (blur)="taskTitleBlur.emit(member.userId)"
                  placeholder="必填：选择模板或手动输入任务"
                />
                <nz-autocomplete #taskTitleAuto [nzDefaultActiveFirstOption]="false">
                  @for (task of templates(); track task.id) {
                    <nz-auto-option [nzValue]="task.title" [nzLabel]="task.title">
                      <div class="template-preview__option">
                        <strong>{{ task.title }}</strong>
                        @if (task.description) {
                          <span>{{ task.description }}</span>
                        }
                      </div>
                    </nz-auto-option>
                  }
                </nz-autocomplete>
                @if (taskDescription(member.userId); as description) {
                  <small>{{ description }}</small>
                }
              </div>
              <div
                class="template-preview__date-range"
                [class.template-preview__date-range--error]="planErrors()[member.userId]"
              >
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划开始"
                  nzPopupClassName="hub-datepicker-overlay"
                  [ngModel]="taskPlanStartDate(member.userId)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="taskPlanDateChange.emit({ userId: member.userId, key: 'start', value: $event })"
                ></nz-date-picker>
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划结束"
                  nzPopupClassName="hub-datepicker-overlay"
                  [ngModel]="taskPlanEndDate(member.userId)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="taskPlanDateChange.emit({ userId: member.userId, key: 'end', value: $event })"
                ></nz-date-picker>
              </div>
            </div>
          }
        </div>
        @if (missingTitleError()) {
          <p class="template-preview__error">{{ missingTitleError() }}</p>
        }
        @if (planError()) {
          <p class="template-preview__error">{{ planError() }}</p>
        }
        @if (templates().length === 0) {
          <p class="template-preview__hint">{{ noTemplateText() }}</p>
        }
      } @else {
        <p class="template-preview__empty">{{ emptyText() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .template-preview {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
        padding: 12px;
      }
      .template-preview__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .template-preview__header div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .template-preview__header span,
      .template-preview__empty,
      .template-preview__hint {
        color: var(--text-muted);
        font-size: 12px;
      }
      .template-preview__list {
        display: grid;
        gap: 8px;
        margin: 0;
      }
      .template-preview__item {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr) 280px;
        gap: 12px;
        align-items: center;
        min-width: 0;
        padding: 8px 10px;
        border: 1px solid var(--border-color-soft);
        border-radius: 6px;
        background: var(--bg-container);
      }
      .template-preview__owner {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 600;
      }
      .template-preview__task-input,
      .template-preview__option {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .template-preview__date-range {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }
      .template-preview__date-range nz-date-picker {
        width: 100%;
      }
      .template-preview__title-input--error,
      .template-preview__title-input--error:hover,
      .template-preview__title-input--error:focus,
      .template-preview__date-range--error nz-date-picker {
        border-color: var(--danger, #ff4d4f) !important;
        box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.12);
      }
      .template-preview__option strong,
      .template-preview__option span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .template-preview__option span,
      .template-preview__task-input small {
        color: var(--text-muted);
        font-size: 12px;
      }
      .template-preview__task-input small {
        display: -webkit-box;
        overflow: hidden;
        line-height: 1.45;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .template-preview__empty,
      .template-preview__hint {
        margin: 0;
      }
      .template-preview__hint {
        margin-top: 8px;
      }
      .template-preview__error {
        margin: 4px 0 0;
        color: var(--danger, #ff4d4f);
        font-size: 12px;
      }
      @media (max-width: 768px) {
        .template-preview__header {
          align-items: flex-start;
          flex-direction: column;
        }
        .template-preview__item,
        .template-preview__date-range {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdMemberStageTaskPickerComponent {
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly templates = input<RdStageTaskTemplateEntity[]>([]);
  readonly taskTitles = input<Record<string, string>>({});
  readonly taskDescriptions = input<Record<string, string | null>>({});
  readonly taskPlanStartDates = input<Record<string, Date | null>>({});
  readonly taskPlanEndDates = input<Record<string, Date | null>>({});
  readonly titleErrors = input<Record<string, boolean>>({});
  readonly planErrors = input<Record<string, boolean>>({});
  readonly taskCount = input(0);
  readonly helperText = input('按执行人选择当前阶段模板任务，也可手动输入；每位执行人必须指定任务。');
  readonly emptyText = input('选择执行人后，可按执行人配置阶段任务。');
  readonly noTemplateText = input('该阶段未配置任务模板，可直接手动输入阶段任务。');
  readonly missingTitleError = input('');
  readonly planError = input('');

  readonly taskTitleChange = output<{ userId: string; value: unknown }>();
  readonly taskTitleBlur = output<string>();
  readonly taskPlanDateChange = output<{ userId: string; key: TaskPlanKey; value: unknown }>();

  taskTitle(userId: string): string {
    return this.taskTitles()[userId] ?? '';
  }

  taskDescription(userId: string): string | null {
    return this.taskDescriptions()[userId] ?? null;
  }

  taskPlanStartDate(userId: string): Date | null {
    return this.taskPlanStartDates()[userId] ?? null;
  }

  taskPlanEndDate(userId: string): Date | null {
    return this.taskPlanEndDates()[userId] ?? null;
  }
}
