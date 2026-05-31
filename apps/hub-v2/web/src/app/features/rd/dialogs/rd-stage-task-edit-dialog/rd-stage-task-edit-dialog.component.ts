import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { UPLOAD_TARGETS } from '@shared/constants';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdStageTaskTemplateEntity } from '../../models/rd.model';

export interface RdStageTaskEditDraft {
  localId: string;
  taskId: string | null;
  title: string;
  description: string;
  ownerIds: string[];
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
}

@Component({
  selector: 'app-rd-stage-task-edit-dialog',
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
      [title]="initialDraft()?.taskId ? '编辑阶段任务' : '新增阶段任务'"
      [subtitle]="stageName()"
      [icon]="initialDraft()?.taskId ? 'edit' : 'plus'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-stage-task-edit-form" nz-form nzLayout="vertical" (ngSubmit)="submitDraft()">
          <nz-form-item>
            <nz-form-label>阶段</nz-form-label>
            <nz-form-control>
              <div class="stage-field">
                <strong>{{ stageName() || '未归类' }}</strong>
                <span>当前阶段</span>
              </div>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>任务标题</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                maxlength="200"
                [nzAutocomplete]="taskTitleAuto"
                [ngModel]="title()"
                name="taskTitle"
                (ngModelChange)="onTitleChange($event)"
                placeholder="选择模板或手动输入任务标题"
              />
              <nz-autocomplete #taskTitleAuto [nzDefaultActiveFirstOption]="false">
                @for (template of templates(); track template.id) {
                  <nz-auto-option [nzValue]="template.title" [nzLabel]="template.title">
                    <div class="task-option">
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
                [ngModel]="description()"
                name="taskDescription"
                [config]="editorConfig"
                [imageUploadHandler]="uploadMarkdownImage"
                [placeholder]="'补充任务说明、验收口径或交付要求。'"
                minHeight="180px"
                (contentChange)="description.set($event)"
                (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>负责人</nz-form-label>
            <nz-form-control>
              <nz-select
                nzMode="multiple"
                nzShowSearch
                nzPlaceHolder="选择负责人"
                [ngModel]="ownerIds()"
                name="ownerIds"
                (ngModelChange)="onOwnersChange($event)"
              >
                @for (member of ownerOptions(); track member.userId) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <div class="date-range">
            <nz-form-item>
              <nz-form-label>计划开始</nz-form-label>
              <nz-form-control [nzValidateStatus]="hasInvalidDateRange() ? 'error' : ''">
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划开始"
                  [ngModel]="plannedStartDate()"
                  name="plannedStartAt"
                  (ngModelChange)="setPlannedDate('start', $event)"
                />
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label>计划结束</nz-form-label>
              <nz-form-control
                [nzValidateStatus]="hasInvalidDateRange() ? 'error' : ''"
                nzErrorTip="任务计划时间需合法，且必须在当前阶段计划周期内。"
              >
                <nz-date-picker
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="计划结束"
                  [ngModel]="plannedEndDate()"
                  name="plannedEndAt"
                  (ngModelChange)="setPlannedDate('end', $event)"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" [disabled]="!canSubmit()" type="submit" form="rd-stage-task-edit-form">
            确认
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .stage-field {
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
      .stage-field strong {
        color: var(--text-primary);
        font-size: 13px;
      }
      .stage-field span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .task-option {
        min-width: 0;
        display: grid;
        gap: 2px;
      }
      .task-option strong,
      .task-option span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .task-option span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .date-range {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }
      .date-range nz-date-picker {
        width: 100%;
      }
      @media (max-width: 760px) {
        .date-range {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdStageTaskEditDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly stageName = input('');
  readonly initialDraft = input<RdStageTaskEditDraft | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly memberIds = input<string[]>([]);
  readonly templates = input<RdStageTaskTemplateEntity[]>([]);
  readonly stagePlanStartDate = input<Date | null>(null);
  readonly stagePlanEndDate = input<Date | null>(null);
  readonly confirm = output<RdStageTaskEditDraft>();
  readonly cancel = output<void>();

  readonly title = signal('');
  readonly description = signal('');
  readonly ownerIds = signal<string[]>([]);
  readonly plannedStartDate = signal<Date | null>(null);
  readonly plannedEndDate = signal<Date | null>(null);
  readonly editorConfig = {
    autosave: false,
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file, UPLOAD_TARGETS.markdownImage);

  readonly ownerOptions = computed(() => {
    const allowedIds = new Set(this.memberIds().map((id) => id.trim()).filter(Boolean));
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
      const draft = this.initialDraft();
      this.title.set(draft?.title ?? '');
      this.description.set(draft?.description ?? '');
      this.ownerIds.set(draft?.ownerIds ?? []);
      this.plannedStartDate.set(draft?.plannedStartDate ? new Date(draft.plannedStartDate) : this.cloneDate(this.stagePlanStartDate()));
      this.plannedEndDate.set(draft?.plannedEndDate ? new Date(draft.plannedEndDate) : this.cloneDate(this.stagePlanEndDate()));
    });
  }

  canSubmit(): boolean {
    return !!this.title().trim() && this.ownerIds().length > 0 && !this.hasInvalidDateRange();
  }

  submitDraft(): void {
    if (!this.canSubmit()) {
      return;
    }
    const initial = this.initialDraft();
    this.confirm.emit({
      localId: initial?.localId ?? `new-${Date.now()}`,
      taskId: initial?.taskId ?? null,
      title: this.title().trim(),
      description: this.description(),
      ownerIds: this.ownerIds(),
      plannedStartDate: this.cloneDate(this.plannedStartDate()),
      plannedEndDate: this.cloneDate(this.plannedEndDate()),
    });
  }

  onTitleChange(value: unknown): void {
    const title = String(value ?? '').slice(0, 200);
    this.title.set(title);
    const template = this.templates().find((item) => item.title === title.trim()) ?? null;
    if (template) {
      this.description.set(template.description ?? '');
    }
  }

  onOwnersChange(value: unknown): void {
    const allowedIds = new Set(this.ownerOptions().map((member) => member.userId));
    const ids = Array.isArray(value)
      ? Array.from(new Set(value.map((item) => String(item || '').trim()).filter((id) => id && allowedIds.has(id))))
      : [];
    this.ownerIds.set(ids);
  }

  setPlannedDate(key: 'start' | 'end', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'start') {
      this.plannedStartDate.set(date);
      return;
    }
    this.plannedEndDate.set(date);
  }

  hasInvalidDateRange(): boolean {
    const start = this.plannedStartDate();
    const end = this.plannedEndDate();
    if (start && end && start.getTime() > end.getTime()) {
      return true;
    }
    const stageStart = this.stagePlanStartDate();
    const stageEnd = this.stagePlanEndDate();
    if (stageStart && start && start.getTime() < stageStart.getTime()) {
      return true;
    }
    if (stageEnd && start && start.getTime() > stageEnd.getTime()) {
      return true;
    }
    if (stageStart && end && end.getTime() < stageStart.getTime()) {
      return true;
    }
    if (stageEnd && end && end.getTime() > stageEnd.getTime()) {
      return true;
    }
    return false;
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  private cloneDate(value: Date | null): Date | null {
    return value ? new Date(value) : null;
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
