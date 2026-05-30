import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { resolveRdStageKey, type RdStageEntity, type RdStageTaskTemplateEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-stage-task-create-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
    NzAutocompleteModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="820"
      [title]="'新增阶段任务'"
      [subtitle]="''"
      [icon]="'plus'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-stage-task-create-form" nz-form nzLayout="vertical" (ngSubmit)="submitCreate()">
          <nz-form-item>
            <nz-form-label>阶段</nz-form-label>
            <nz-form-control>
              <div class="stage-task-stage-field">
                <strong>{{ currentStageName() }}</strong>
                <span>当前阶段</span>
              </div>
            </nz-form-control>
          </nz-form-item>

          @if (!canOpenCreateDialog()) {
            <div class="stage-task-warning">当前研发项没有可用阶段，不能新增阶段任务。</div>
          }

          <nz-form-item>
            <nz-form-label nzRequired>任务标题</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                maxlength="200"
                [nzAutocomplete]="taskTitleAuto"
                [ngModel]="taskTitle()"
                name="taskTitle"
                (ngModelChange)="onTaskTitleChange($event)"
                placeholder="选择模板或手动输入任务标题"
              />
              <nz-autocomplete #taskTitleAuto [nzDefaultActiveFirstOption]="false">
                @for (template of currentStageTemplates(); track template.id) {
                  <nz-auto-option [nzValue]="template.title" [nzLabel]="template.title">
                    <div class="stage-task-title-option">
                      <strong>{{ template.title }}</strong>
                      @if (template.description) {
                        <span>{{ template.description }}</span>
                      }
                    </div>
                  </nz-auto-option>
                }
              </nz-autocomplete>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>描述</nz-form-label>
            <nz-form-control>
              <app-markdown-editor
                [ngModel]="taskDescription() || ''"
                name="taskDescription"
                [config]="editorConfig"
                [imageUploadHandler]="uploadMarkdownImage"
                [placeholder]="'补充任务说明、验收口径或交付要求。（会显示在研发项描述区域）'"
                minHeight="180px"
                (contentChange)="setTaskDescription($event)"
                (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>执行人</nz-form-label>
            <nz-form-control>
              <nz-select
                nzMode="multiple"
                nzShowSearch
                nzPlaceHolder="选择执行该任务的项目成员"
                [ngModel]="selectedOwnerIds()"
                name="ownerIds"
                (ngModelChange)="onSelectedOwnersChange($event)"
              >
                @for (member of ownerOptions(); track member.userId) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <div class="stage-task-date-range">
            <nz-form-item>
              <nz-form-label>计划开始</nz-form-label>
              <nz-form-control>
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划开始"
                  [ngModel]="plannedStartDate()"
                  name="plannedStartAt"
                  (ngModelChange)="setPlannedDate('start', $event)"
                ></nz-date-picker>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label>计划结束</nz-form-label>
              <nz-form-control>
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划结束"
                  [ngModel]="plannedEndDate()"
                  name="plannedEndAt"
                  (ngModelChange)="setPlannedDate('end', $event)"
                ></nz-date-picker>
              </nz-form-control>
            </nz-form-item>
          </div>

          @if (hasInvalidDateRange()) {
            <div class="stage-task-warning">计划开始不能晚于计划结束。</div>
          }
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" [disabled]="!canSubmitCreate()" type="submit" form="rd-stage-task-create-form">
            创建阶段任务
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .stage-task-stage-field {
        min-height: 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 11px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-subtle);
      }
      .stage-task-stage-field strong {
        color: var(--text-primary);
        font-size: 13px;
      }
      .stage-task-stage-field span,
      .stage-task-warning {
        color: var(--text-muted);
        font-size: 12px;
      }
      .stage-task-warning {
        margin: -2px 0 8px;
      }
      .stage-task-title-option {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stage-task-title-option strong,
      .stage-task-title-option span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .stage-task-title-option span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .stage-task-date-range {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }
      .stage-task-date-range nz-date-picker {
        width: 100%;
      }
      @media (max-width: 760px) {
        .stage-task-date-range {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdStageTaskCreateDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly memberIds = input<string[]>([]);
  readonly currentStageId = input<string | null>(null);
  readonly planStartAt = input<string | null>(null);
  readonly planEndAt = input<string | null>(null);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);

  readonly createTasks = output<{
    tasks: Array<{
      stageKey: string;
      title: string;
      description?: string | null;
      ownerIds: string[];
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    }>;
  }>();
  readonly cancel = output<void>();

  readonly selectedOwnerIds = signal<string[]>([]);
  readonly taskTitleValue = signal('');
  readonly taskDescriptionValue = signal<string | null>(null);
  readonly plannedStartDateValue = signal<Date | null>(null);
  readonly plannedEndDateValue = signal<Date | null>(null);
  readonly editorConfig = {
    autosave: false,
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => this.imageUpload.uploadImage(file);

  readonly currentStage = computed(() => {
    const stageId = this.currentStageId()?.trim();
    if (!stageId) {
      return null;
    }
    return this.stages().find((stage) => stage.id === stageId) ?? null;
  });

  readonly currentStageKey = computed(() => {
    const stage = this.currentStage();
    return stage && stage.enabled ? resolveRdStageKey(stage) : '';
  });

  readonly currentStageName = computed(() => this.currentStage()?.name ?? '未归类');

  readonly currentStageTemplates = computed(() => {
    const stage = this.currentStage();
    if (!stage || !stage.enabled) {
      return [];
    }
    return this.stageTaskTemplates()
      .filter((template) => template.stageId === stage.id && template.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  });

  readonly ownerOptions = computed(() => {
    const allowedIds = new Set(this.memberIds().map((item) => item.trim()).filter(Boolean));
    const members = this.members().filter((member) => member.userId.trim());
    if (allowedIds.size === 0) {
      return members;
    }
    return members.filter((member) => allowedIds.has(member.userId));
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedOwnerIds.set([]);
      this.taskTitleValue.set('');
      this.taskDescriptionValue.set(null);
      this.plannedStartDateValue.set(this.normalizeDate(this.planStartAt()));
      this.plannedEndDateValue.set(this.normalizeDate(this.planEndAt()));
    });
  }

  canOpenCreateDialog(): boolean {
    return !!this.currentStageKey();
  }

  canSubmitCreate(): boolean {
    if (!this.currentStageKey() || this.selectedOwnerIds().length === 0) {
      return false;
    }
    return !!this.taskTitle().trim() && !this.hasInvalidDateRange();
  }

  submitCreate(): void {
    const stageKey = this.currentStageKey();
    if (!stageKey || !this.canSubmitCreate()) {
      return;
    }
    this.createTasks.emit({
      tasks: [
        {
          stageKey,
          ownerIds: this.selectedOwnerIds(),
          title: this.taskTitle().trim(),
          description: this.taskDescription(),
          plannedStartAt: this.formatDate(this.plannedStartDate()) ?? null,
          plannedEndAt: this.formatDate(this.plannedEndDate()) ?? null,
        },
      ],
    });
  }

  onSelectedOwnersChange(value: unknown): void {
    const allowedIds = new Set(this.ownerOptions().map((member) => member.userId));
    const selectedOwnerIds = Array.isArray(value)
      ? [...new Set((value as string[]).map((item) => item.trim()).filter((item) => item && allowedIds.has(item)))]
      : [];
    this.selectedOwnerIds.set(selectedOwnerIds);
  }

  onTaskTitleChange(value: unknown): void {
    const title = this.normalizeTitle(value);
    this.setTaskTitle(title);
    const template = this.currentStageTemplates().find((item) => item.title === title.trim()) ?? null;
    if (template) {
      this.taskDescriptionValue.set(template.description);
    }
  }

  normalizeTitle(value: unknown): string {
    return String(value ?? '').slice(0, 200);
  }

  taskTitle(): string {
    return this.taskTitleValue();
  }

  taskDescription(): string | null {
    return this.taskDescriptionValue();
  }

  setTaskDescription(value: string): void {
    this.taskDescriptionValue.set(value.trim() ? value : null);
  }

  plannedStartDate(): Date | null {
    return this.plannedStartDateValue();
  }

  plannedEndDate(): Date | null {
    return this.plannedEndDateValue();
  }

  setPlannedDate(key: 'start' | 'end', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'start') {
      this.plannedStartDateValue.set(date);
      return;
    }
    this.plannedEndDateValue.set(date);
  }

  hasInvalidDateRange(): boolean {
    const start = this.plannedStartDate();
    const end = this.plannedEndDate();
    return !!start && !!end && start.getTime() > end.getTime();
  }

  setTaskTitle(title: string): void {
    this.taskTitleValue.set(title);
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  private formatDate(value: unknown): string | undefined {
    const date = this.normalizeDate(value);
    if (!date) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
}
