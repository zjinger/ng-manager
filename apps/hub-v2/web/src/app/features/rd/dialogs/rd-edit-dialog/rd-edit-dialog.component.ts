import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, MarkdownEditorComponent, MarkdownViewerComponent } from '@shared/ui';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import {
  getRdMemberIds,
  resolveRdStageKey,
  type CreateRdStageTaskInput,
  type RdItemEntity,
  type RdItemStageNoteEntity,
  type RdStageEntity,
  type RdStageTaskEntity,
  type RdStageTaskTemplateEntity,
  type UpdateRdStageTaskInput,
} from '../../models/rd.model';
import {
  RdStageTaskEditDialogComponent,
  type RdStageTaskEditDraft,
} from '../rd-stage-task-edit-dialog/rd-stage-task-edit-dialog.component';
import {
  RdEditStageTaskListComponent,
  type RdEditStageTaskDraft,
} from './rd-edit-stage-task-list.component';

export interface RdEditDialogSaveInput {
  title: string;
  description: string | null;
  memberIds: string[];
  verifierId: string | null;
  planStartAt: string | null;
  planEndAt: string | null;
  stageDescription: string | null;
  taskCreates: CreateRdStageTaskInput[];
  taskUpdates: Array<{ taskId: string; input: UpdateRdStageTaskInput }>;
  taskCancelIds: string[];
}

type TaskDraft = RdEditStageTaskDraft;

@Component({
  selector: 'app-rd-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    MarkdownEditorComponent,
    MarkdownViewerComponent,
    RdEditStageTaskListComponent,
    RdStageTaskEditDialogComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="940"
      [title]="'编辑研发项'"
      [subtitle]="item()?.rdNo || ''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form
          id="rd-edit-form"
          nz-form
          nzLayout="vertical"
          class="edit-form"
          (ngSubmit)="submitForm()"
        >
          <section class="edit-section">
            <div class="edit-section__header">
              <h3>基础信息</h3>
            </div>
            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  maxlength="120"
                  [ngModel]="title()"
                  name="title"
                  (ngModelChange)="title.set($event)"
                />
              </nz-form-control>
            </nz-form-item>

            <div class="edit-form__grid">
              <nz-form-item>
                <nz-form-label nzRequired>执行人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzMode="multiple"
                    nzShowSearch
                    nzAllowClear
                    nzPlaceHolder="至少选择 1 名执行人"
                    [ngModel]="memberIds()"
                    name="memberIds"
                    (ngModelChange)="onMemberIdsChange($event)"
                  >
                    @for (member of members(); track member.userId) {
                      <nz-option
                        [nzLabel]="member.displayName"
                        [nzValue]="member.userId"
                      ></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>验证人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzShowSearch
                    nzAllowClear
                    nzPlaceHolder="未指定时默认为创建人"
                    [ngModel]="verifierId()"
                    name="verifierId"
                    (ngModelChange)="verifierId.set(normalizeNullableUserId($event))"
                  >
                    @for (member of members(); track member.userId) {
                      <nz-option
                        [nzLabel]="member.displayName"
                        [nzValue]="member.userId"
                      ></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="markdown-field">
              <div class="markdown-field__header">
                <span>研发项描述</span>
                @if (descriptionEditing()) {
                  <button
                    nz-button
                    nzType="text"
                    type="button"
                    (click)="descriptionEditing.set(false)"
                  >
                    <span nz-icon nzType="eye"></span>
                    预览
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="text"
                    type="button"
                    (click)="descriptionEditing.set(true)"
                  >
                    <span nz-icon nzType="edit"></span>
                    编辑
                  </button>
                }
              </div>
              @if (descriptionEditing()) {
                <app-markdown-editor
                  [ngModel]="description()"
                  name="description"
                  [config]="editorConfig"
                  [imageUploadHandler]="uploadMarkdownImage"
                  (contentChange)="description.set($event)"
                  (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                  [minHeight]="'140px'"
                  [placeholder]="'简要描述背景、目标和预期交付。'"
                />
              } @else {
                <div
                  class="markdown-preview"
                  [class.markdown-preview--empty]="!description().trim()"
                >
                  @if (description().trim()) {
                    <app-markdown-viewer
                      [content]="description()"
                      [showToc]="false"
                    ></app-markdown-viewer>
                  } @else {
                    <span>暂无研发项描述，点击编辑补充。</span>
                  }
                </div>
              }
            </div>
          </section>

          <section class="edit-section">
            <div class="edit-section__header">
              <h3>当前阶段</h3>
            </div>
            <nz-form-item style="margin-bottom: 0px;">
              <!-- <nz-form-label>当前阶段</nz-form-label> -->
              <nz-form-control>
                <div class="readonly-stage">
                  <strong>{{ currentStageName() }}</strong>
                </div>
              </nz-form-control>
            </nz-form-item>
            <div class="edit-form__grid">
              <nz-form-item>
                <nz-form-label>计划开始</nz-form-label>
                <nz-form-control [nzValidateStatus]="hasInvalidStageDateRange() ? 'error' : ''">
                  <nz-date-picker
                    class="date-picker"
                    nzAllowClear
                    [ngModel]="planStartDate()"
                    name="planStartAt"
                    (ngModelChange)="setPlanDate('start', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>计划结束</nz-form-label>
                <nz-form-control
                  [nzValidateStatus]="hasInvalidStageDateRange() ? 'error' : ''"
                  nzErrorTip="当前阶段计划开始不能晚于计划结束。"
                >
                  <nz-date-picker
                    class="date-picker"
                    nzAllowClear
                    [ngModel]="planEndDate()"
                    name="planEndAt"
                    (ngModelChange)="setPlanDate('end', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="markdown-field">
              <div class="markdown-field__header">
                <span>阶段说明</span>
                @if (stageDescriptionEditing()) {
                  <button
                    nz-button
                    nzType="text"
                    type="button"
                    (click)="stageDescriptionEditing.set(false)"
                  >
                    <span nz-icon nzType="eye"></span>
                    预览
                  </button>
                } @else {
                  <button
                    nz-button
                    nzType="text"
                    type="button"
                    (click)="stageDescriptionEditing.set(true)"
                  >
                    <span nz-icon nzType="edit"></span>
                    编辑
                  </button>
                }
              </div>
              @if (stageDescriptionEditing()) {
                <app-markdown-editor
                  [ngModel]="stageDescription()"
                  name="stageDescription"
                  [config]="editorConfig"
                  [imageUploadHandler]="uploadMarkdownImage"
                  (contentChange)="stageDescription.set($event)"
                  (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                  [minHeight]="'130px'"
                  [placeholder]="'补充当前阶段的目标、注意事项或验收口径。'"
                />
              } @else {
                <div
                  class="markdown-preview"
                  [class.markdown-preview--empty]="!stageDescription().trim()"
                >
                  @if (stageDescription().trim()) {
                    <app-markdown-viewer
                      [content]="stageDescription()"
                      [showToc]="false"
                    ></app-markdown-viewer>
                  } @else {
                    <span>暂无阶段说明，点击编辑补充。</span>
                  }
                </div>
              }
            </div>
          </section>

          <section class="edit-section">
            <nz-form-item>
              <nz-form-control
                [nzValidateStatus]="hasNoActiveStageTaskOwner() ? 'error' : ''"
                nzErrorTip="当前阶段至少需要保留一项执行人任务。"
              >
                <app-rd-edit-stage-task-list
                  [drafts]="taskDrafts()"
                  [members]="members()"
                  [canEdit]="!!currentStageKey()"
                  (add)="openAddTaskDialog()"
                  (edit)="openEditTaskDialog($event)"
                  (remove)="removeTaskDraft($event)"
                />
              </nz-form-control>
            </nz-form-item>
          </section>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [disabled]="!isFormValid()"
          [nzLoading]="busy()"
          type="submit"
          form="rd-edit-form"
        >
          保存
        </button>
      </ng-container>
    </app-dialog-shell>

    <app-rd-stage-task-edit-dialog
      [open]="taskEditorOpen()"
      [stageName]="currentStageName()"
      [initialDraft]="taskEditorDraft()"
      [members]="members()"
      [memberIds]="memberIds()"
      [templates]="currentStageTemplates()"
      [stagePlanStartDate]="planStartDate()"
      [stagePlanEndDate]="planEndDate()"
      (confirm)="applyTaskDraft($event)"
      (cancel)="closeTaskEditor()"
    />
  `,
  styles: [
    `
      .edit-form {
        display: grid;
        gap: 16px;
      }
      .edit-section {
        display: grid;
        gap: 12px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .edit-section:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .edit-section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .edit-section__header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 700;
      }
      .edit-form__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
      }
      .readonly-stage {
        display: flex;
        align-items: center;
        min-height: 36px;
        padding: 0 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .date-picker {
        width: 100%;
      }
      .markdown-field {
        display: grid;
        gap: 8px;
      }
      .markdown-field__header {
        display: flex;
        align-items: center;
        // justify-content: space-between;
        gap: 12px;
      }
      .markdown-field__header span:first-child {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 500;
      }
      .markdown-preview {
        min-height: 86px;
        max-height: 220px;
        overflow-y: auto;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .markdown-preview--empty {
        display: flex;
        align-items: center;
        color: var(--text-muted);
        font-size: 13px;
      }
      @media (max-width: 768px) {
        .edit-form__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdEditDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageNotes = input<RdItemStageNoteEntity[]>([]);
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly save = output<RdEditDialogSaveInput>();
  readonly cancel = output<void>();

  readonly title = signal('');
  readonly description = signal('');
  readonly descriptionEditing = signal(false);
  readonly memberIds = signal<string[]>([]);
  readonly verifierId = signal<string | null>(null);
  readonly stageDescription = signal('');
  readonly stageDescriptionEditing = signal(false);
  readonly planStartDate = signal<Date | null>(null);
  readonly planEndDate = signal<Date | null>(null);
  readonly taskDrafts = signal<TaskDraft[]>([]);
  readonly taskCancelIds = signal<string[]>([]);
  readonly taskEditorOpen = signal(false);
  readonly taskEditorDraft = signal<RdStageTaskEditDraft | null>(null);
  readonly editorConfig = {
    autosave: false,
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file);

  readonly currentStage = computed(() => {
    const stageId = this.item()?.stageId?.trim();
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
    if (!stage) {
      return [];
    }
    return this.stageTaskTemplates()
      .filter((template) => template.stageId === stage.id && template.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const current = this.item();
      const currentStage = current?.stageId
        ? (this.stages().find((stage) => stage.id === current.stageId) ?? null)
        : null;
      const currentStageKey = currentStage ? resolveRdStageKey(currentStage) : '';
      const currentStageNote = current?.stageId
        ? this.stageNotes().find((note) => note.stageId === current.stageId)
        : null;
      this.title.set(current?.title ?? '');
      this.description.set(current?.description ?? '');
      this.descriptionEditing.set(false);
      this.memberIds.set(getRdMemberIds(current));
      this.verifierId.set(current?.verifierId?.trim() || null);
      this.stageDescription.set(currentStageNote?.description ?? '');
      this.stageDescriptionEditing.set(false);
      this.planStartDate.set(this.normalizeDate(current?.planStartAt));
      this.planEndDate.set(this.normalizeDate(current?.planEndAt));
      this.taskCancelIds.set([]);
      this.closeTaskEditor();
      this.taskDrafts.set(
        this.stageTasks()
          .filter(
            (task) =>
              task.status !== 'cancelled' &&
              (!currentStageKey || task.stageKey === currentStageKey),
          )
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
          .map((task) => this.createDraftFromTask(task)),
      );
    });
  }

  isFormValid(): boolean {
    if (!this.title().trim() || this.memberIds().length === 0 || this.hasInvalidStageDateRange() || this.hasNoActiveStageTaskOwner()) {
      return false;
    }
    return this.taskDrafts().every((draft) => this.isDraftValid(draft));
  }

  submitForm(): void {
    if (!this.isFormValid()) {
      return;
    }
    const title = this.title().trim();
    const desc = this.description().trim();
    const stageDesc = this.stageDescription().trim();
    this.save.emit({
      title,
      description: desc || null,
      memberIds: this.memberIds(),
      verifierId: this.normalizeNullableUserId(this.verifierId()),
      planStartAt: this.formatDate(this.planStartDate()) ?? null,
      planEndAt: this.formatDate(this.planEndDate()) ?? null,
      stageDescription: stageDesc || null,
      taskCreates: this.buildTaskCreates(),
      taskUpdates: this.buildTaskUpdates(),
      taskCancelIds: this.taskCancelIds(),
    });
  }

  onMemberIdsChange(value: unknown): void {
    const nextIds = this.normalizeUserIds(value);
    this.memberIds.set(nextIds);
    const allowed = new Set(nextIds);
    this.taskDrafts.update((drafts) =>
      drafts.map((draft) => ({
        ...draft,
        ownerIds: draft.ownerIds.filter((id) => allowed.has(id)),
      })),
    );
  }

  openAddTaskDialog(): void {
    const planStart = this.planStartDate();
    const planEnd = this.planEndDate();
    this.taskEditorDraft.set({
      localId: `new-${Date.now()}`,
      taskId: null,
      title: '',
      description: '',
      ownerIds: [],
      plannedStartDate: planStart ? new Date(planStart) : null,
      plannedEndDate: planEnd ? new Date(planEnd) : null,
    });
    this.taskEditorOpen.set(true);
  }

  openEditTaskDialog(localId: string): void {
    const draft = this.taskDrafts().find((item) => item.localId === localId);
    if (!draft) {
      return;
    }
    this.taskEditorDraft.set(this.toTaskEditDraft(draft));
    this.taskEditorOpen.set(true);
  }

  applyTaskDraft(draft: RdStageTaskEditDraft): void {
    this.taskDrafts.update((drafts) => {
      const index = drafts.findIndex((item) => item.localId === draft.localId);
      if (index < 0) {
        return [...drafts, { ...draft, original: null }];
      }
      return drafts.map((item) => (item.localId === draft.localId ? { ...item, ...draft } : item));
    });
    this.closeTaskEditor();
  }

  closeTaskEditor(): void {
    this.taskEditorOpen.set(false);
    this.taskEditorDraft.set(null);
  }

  removeTaskDraft(localId: string): void {
    const draft = this.taskDrafts().find((item) => item.localId === localId);
    const remainingActiveOwnerCount = this.taskDrafts()
      .filter((item) => item.localId !== localId)
      .reduce((count, item) => count + item.ownerIds.length, 0);
    if (this.currentStageKey() && remainingActiveOwnerCount <= 0) {
      this.message.warning('当前阶段至少需要保留一项执行人任务。');
      return;
    }
    if (draft?.taskId) {
      this.taskCancelIds.update((ids) => Array.from(new Set([...ids, draft.taskId as string])));
    }
    this.taskDrafts.update((drafts) => drafts.filter((item) => item.localId !== localId));
  }

  setPlanDate(key: 'start' | 'end', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'start') {
      this.planStartDate.set(date);
      return;
    }
    this.planEndDate.set(date);
  }

  hasInvalidStageDateRange(): boolean {
    const start = this.planStartDate();
    const end = this.planEndDate();
    return !!start && !!end && start.getTime() > end.getTime();
  }

  hasNoActiveStageTaskOwner(): boolean {
    if (!this.currentStageKey()) {
      return false;
    }
    return this.taskDrafts().reduce((count, draft) => count + draft.ownerIds.length, 0) <= 0;
  }

  isDraftDateInvalid(draft: TaskDraft): boolean {
    const start = draft.plannedStartDate;
    const end = draft.plannedEndDate;
    if (start && end && start.getTime() > end.getTime()) {
      return true;
    }
    const stageStart = this.planStartDate();
    const stageEnd = this.planEndDate();
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

  normalizeNullableUserId(value: unknown): string | null {
    const id = String(value ?? '').trim();
    return id || null;
  }

  private createDraftFromTask(task: RdStageTaskEntity): TaskDraft {
    return {
      localId: task.id,
      taskId: task.id,
      original: task,
      title: task.title,
      description: task.description ?? '',
      ownerIds: task.ownerIds,
      plannedStartDate: this.normalizeDate(task.plannedStartAt),
      plannedEndDate: this.normalizeDate(task.plannedEndAt),
    };
  }

  private toTaskEditDraft(draft: TaskDraft): RdStageTaskEditDraft {
    return {
      localId: draft.localId,
      taskId: draft.taskId,
      title: draft.title,
      description: draft.description,
      ownerIds: draft.ownerIds,
      plannedStartDate: draft.plannedStartDate,
      plannedEndDate: draft.plannedEndDate,
    };
  }

  private isDraftValid(draft: TaskDraft): boolean {
    return !!draft.title.trim() && draft.ownerIds.length > 0 && !this.isDraftDateInvalid(draft);
  }

  private buildTaskCreates(): CreateRdStageTaskInput[] {
    const stageKey = this.currentStageKey();
    if (!stageKey) {
      return [];
    }
    return this.taskDrafts()
      .filter((draft) => !draft.taskId)
      .map((draft) => ({
        stageKey,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        ownerIds: draft.ownerIds,
        plannedStartAt: this.formatDate(draft.plannedStartDate) ?? null,
        plannedEndAt: this.formatDate(draft.plannedEndDate) ?? null,
      }));
  }

  private buildTaskUpdates(): Array<{ taskId: string; input: UpdateRdStageTaskInput }> {
    const updates: Array<{ taskId: string; input: UpdateRdStageTaskInput }> = [];
    for (const draft of this.taskDrafts()) {
      if (!draft.taskId || !draft.original) {
        continue;
      }
      const input: UpdateRdStageTaskInput = {};
      const title = draft.title.trim();
      const description = draft.description.trim() || null;
      const plannedStartAt = this.formatDate(draft.plannedStartDate) ?? null;
      const plannedEndAt = this.formatDate(draft.plannedEndDate) ?? null;
      if (title !== draft.original.title) {
        input.title = title;
      }
      if (description !== (draft.original.description ?? null)) {
        input.description = description;
      }
      if (!this.sameStringArray(draft.ownerIds, draft.original.ownerIds)) {
        input.ownerIds = draft.ownerIds;
      }
      if (plannedStartAt !== draft.original.plannedStartAt) {
        input.plannedStartAt = plannedStartAt;
      }
      if (plannedEndAt !== draft.original.plannedEndAt) {
        input.plannedEndAt = plannedEndAt;
      }
      if (Object.keys(input).length > 0) {
        updates.push({ taskId: draft.taskId, input });
      }
    }
    return updates;
  }

  private normalizeUserIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  private sameStringArray(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => item === b[index]);
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
    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate: unknown }).toDate === 'function'
    ) {
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
