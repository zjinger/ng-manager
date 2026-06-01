import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { RdMemberStageTaskPickerComponent } from '../../components/rd-member-stage-task-picker/rd-member-stage-task-picker.component';
import type { RdInitialStageTaskInput, RdItemEntity, RdStageEntity, RdStageTaskTemplateEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-advance-stage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
    RdMemberStageTaskPickerComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="820"
      [title]="'进入下一阶段'"
      [icon]="'branches'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        @if (item(); as current) {
          <form id="rd-advance-stage-form" nz-form nzLayout="vertical" class="advance-form" (ngSubmit)="confirmSelection()">
            <p class="hint">
              当前研发项：<strong>{{ current.title }}</strong>
            </p>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label nzRequired>下一阶段</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      nzShowSearch
                      nzPlaceHolder="选择下一阶段"
                      [ngModel]="selectedStageId()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="selectedStageId.set($event || '')"
                    >
                      @for (stage of candidateStages(); track stage.id) {
                        <nz-option [nzLabel]="stage.name" [nzValue]="stage.id"></nz-option>
                      }
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label nzRequired>执行人</nz-form-label>
                  <nz-form-control
                    [nzValidateStatus]="showMemberRequiredError() ? 'error' : ''"
                    nzErrorTip="请至少选择 1 名执行人。"
                  >
                    <nz-select
                      nzMode="multiple"
                      nzShowSearch
                      nzPlaceHolder="选择下一阶段成员（默认沿用当前成员）"
                      [ngModel]="selectedMemberIds()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="onSelectedMemberIdsChange($event)"
                    >
                      @for (member of members(); track member.userId) {
                        <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                      }
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label>描述</nz-form-label>
                  <nz-form-control>
                    <app-markdown-editor
                      [ngModel]="description()"
                      name="advanceDescription"
                      [ngModelOptions]="{ standalone: true }"
                      [imageUploadHandler]="uploadMarkdownImage"
                      [placeholder]="'可选：填写本次推进说明（会显示在研发项描述区域）'"
                      minHeight="160px"
                      (contentChange)="description.set(normalizeDescription($event))"
                      (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>计划开始</nz-form-label>
                  <nz-form-control [nzValidateStatus]="invalidDateRange() ? 'error' : ''">
                    <nz-date-picker
                      style="width:100%"
                      nzPlaceHolder="请选择日期"
                      nzFormat="yyyy-MM-dd"
                      nzPopupClassName="hub-datepicker-overlay"
                      [ngModel]="planStartDate()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="updateDateField('planStartAt', $event)"
                    ></nz-date-picker>
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>计划结束</nz-form-label>
                  <nz-form-control
                    [nzValidateStatus]="invalidDateRange() ? 'error' : ''"
                    nzErrorTip="计划开始不能晚于计划结束。"
                  >
                    <nz-date-picker
                      style="width:100%"
                      nzPlaceHolder="请选择日期"
                      nzFormat="yyyy-MM-dd"
                      nzPopupClassName="hub-datepicker-overlay"
                      [ngModel]="planEndDate()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="updateDateField('planEndAt', $event)"
                    ></nz-date-picker>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <nz-form-item>
              <nz-form-label class="template-preview-label" nzRequired>阶段任务</nz-form-label>
              <nz-form-control>
                <app-rd-member-stage-task-picker
                  [members]="selectedExecutorMembers()"
                  [templates]="selectedTemplateTasks()"
                  [taskTitles]="memberTaskTitles()"
                  [taskDescriptions]="memberTaskDescriptions()"
                  [taskPlanStartDates]="memberTaskPlanStartDates()"
                  [taskPlanEndDates]="memberTaskPlanEndDates()"
                  [titleErrors]="memberTaskTitleErrors()"
                  [planErrors]="memberTaskPlanErrors()"
                  [taskCount]="selectedStageTaskCount()"
                  emptyText="选择执行人后，可按执行人配置下一阶段任务。"
                  noTemplateText="该阶段未配置任务模板，可直接手动输入阶段任务。"
                  [missingTitleError]="showMissingStageTaskTitleError() ? '请为每位执行人选择或填写阶段任务标题。' : ''"
                  [planError]="showStageTaskPlanError() ? '阶段任务计划时间需在下一阶段计划周期内，且开始不能晚于结束。' : ''"
                  (taskTitleChange)="setMemberTaskTitle($event.userId, $event.value)"
                  (taskTitleBlur)="markMemberTaskTitleTouched($event)"
                  (taskPlanDateChange)="setMemberTaskPlanDate($event.userId, $event.key, $event.value)"
                />
              </nz-form-control>
            </nz-form-item>
          </form>

          @if (candidateStages().length === 0) {
            <p class="empty">当前项目没有可推进的后续阶段。</p>
          }
        }
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button
            nz-button
            nzType="primary"
            [nzLoading]="busy()"
            [disabled]="busy() || !selectedStageId() || selectedMemberIds().length === 0 || hasMissingStageTaskTitle() || invalidDateRange() || invalidStageTaskPlanRange()"
            type="submit"
            form="rd-advance-stage-form"
          >
            确认推进
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .advance-form {
        padding-top: 2px;
      }
      .hint {
        margin: 0 0 12px;
        color: var(--text-secondary);
      }
      .hint--sub {
        margin-top: 0;
      }
      .empty {
        margin: 8px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .template-preview-label {
        margin-top: 8px;
        margin-bottom: 6px;
      }
      @media (max-width: 768px) {
        .advance-form [nz-col] {
          width: 100%;
          max-width: 100%;
          flex: 0 0 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdAdvanceStageDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly currentMemberIds = input<string[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly confirm = output<{ stageId: string; memberIds: string[]; description?: string; planStartAt?: string; planEndAt?: string; stageTasks: RdInitialStageTaskInput[] }>();
  readonly cancel = output<void>();

  readonly selectedStageId = signal('');
  readonly selectedMemberIds = signal<string[]>([]);
  readonly description = signal('');
  readonly planStartDate = signal<Date | null>(null);
  readonly planEndDate = signal<Date | null>(null);
  readonly memberTaskTitles = signal<Record<string, string>>({});
  readonly memberTaskTemplateIds = signal<Record<string, string>>({});
  readonly memberTaskDescriptions = signal<Record<string, string | null>>({});
  readonly memberTaskPlanStartDates = signal<Record<string, Date | null>>({});
  readonly memberTaskPlanEndDates = signal<Record<string, Date | null>>({});
  readonly memberTaskTitleTouched = signal<Record<string, boolean>>({});
  readonly memberTaskPlanTouched = signal<Record<string, boolean>>({});
  readonly memberTouched = signal(false);
  readonly stageTaskTouched = signal(false);
  readonly submitAttempted = signal(false);
  readonly selectedStage = computed(() => this.stages().find((stage) => stage.id === this.selectedStageId()) ?? null);
  readonly selectedStageName = computed(() => this.selectedStage()?.name || '所选阶段');
  readonly selectedTemplateTasks = computed(() => {
    const stage = this.selectedStage();
    if (!stage) {
      return [];
    }
    return this.stageTaskTemplates()
      .filter((item) => item.stageId === stage.id && item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  });
  readonly selectedExecutorMembers = computed(() => {
    const selectedIds = new Set(this.selectedMemberIds().map((item) => item.trim()).filter(Boolean));
    if (selectedIds.size === 0) {
      return [];
    }
    return this.members().filter((member) => selectedIds.has(member.userId));
  });
  readonly selectedStageTaskCount = computed(() => {
    const titles = this.memberTaskTitles();
    return this.selectedExecutorMembers().filter((member) => titles[member.userId]?.trim()).length;
  });
  readonly invalidDateRange = computed(() => {
    const start = this.planStartDate();
    const end = this.planEndDate();
    if (!start || !end) {
      return false;
    }
    return start.getTime() > end.getTime();
  });
  readonly invalidStageTaskPlanRange = computed(() => {
    return this.selectedExecutorMembers().some((member) => this.hasInvalidMemberTaskPlanRange(member.userId));
  });
  readonly hasMissingStageTaskTitle = computed(() => {
    const titles = this.memberTaskTitles();
    return this.selectedExecutorMembers().some((member) => !titles[member.userId]?.trim());
  });
  readonly candidateStages = computed(() => {
    const current = this.item();
    const all = [...this.stages()]
      .filter((stage) => stage.enabled)
      .sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        const aCreated = Date.parse(a.createdAt || '');
        const bCreated = Date.parse(b.createdAt || '');
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return a.id.localeCompare(b.id);
      });
    if (!current) {
      return [];
    }
    if (!current.stageId) {
      return all;
    }
    const currentIndex = all.findIndex((stage) => stage.id === current.stageId);
    if (currentIndex < 0) {
      return all;
    }
    return all.slice(currentIndex + 1);
  });
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file, UPLOAD_TARGETS.markdownImage);

  hasStageTaskError(): boolean {
    return this.hasMissingStageTaskTitle() || this.invalidStageTaskPlanRange();
  }

  showMemberRequiredError(): boolean {
    return (this.memberTouched() || this.submitAttempted()) && this.selectedMemberIds().length === 0;
  }

  showStageTaskError(): boolean {
    return (this.stageTaskTouched() || this.submitAttempted()) && this.hasStageTaskError();
  }

  stageTaskErrorTip(): string {
    if (this.hasMissingStageTaskTitle()) {
      return '请为每位执行人选择或填写阶段任务标题。';
    }
    if (this.invalidStageTaskPlanRange()) {
      return '阶段任务计划时间必须在下一阶段计划开始和计划结束之间，且开始不能晚于结束。';
    }
    return '';
  }

  hasInvalidMemberTaskPlanRange(userId: string): boolean {
    const start = this.memberTaskPlanStartDate(userId);
    const end = this.memberTaskPlanEndDate(userId);
    if (!start && !end) {
      return false;
    }
    if (start && end && start.getTime() > end.getTime()) {
      return true;
    }
    const itemStart = this.planStartDate();
    const itemEnd = this.planEndDate();
    if (itemStart && start && start.getTime() < itemStart.getTime()) {
      return true;
    }
    if (itemEnd && start && start.getTime() > itemEnd.getTime()) {
      return true;
    }
    if (itemStart && end && end.getTime() < itemStart.getTime()) {
      return true;
    }
    return !!itemEnd && !!end && end.getTime() > itemEnd.getTime();
  }

  showMemberTaskTitleError(userId: string): boolean {
    return (this.submitAttempted() || !!this.memberTaskTitleTouched()[userId]) && !this.memberTaskTitle(userId).trim();
  }

  showMissingStageTaskTitleError(): boolean {
    return this.selectedExecutorMembers().some((member) => this.showMemberTaskTitleError(member.userId));
  }

  showMemberTaskPlanError(userId: string): boolean {
    return (this.submitAttempted() || !!this.memberTaskPlanTouched()[userId]) && this.hasInvalidMemberTaskPlanRange(userId);
  }

  showStageTaskPlanError(): boolean {
    return this.selectedExecutorMembers().some((member) => this.showMemberTaskPlanError(member.userId));
  }

  memberTaskTitleErrors(): Record<string, boolean> {
    const errors: Record<string, boolean> = {};
    for (const member of this.selectedExecutorMembers()) {
      errors[member.userId] = this.showMemberTaskTitleError(member.userId);
    }
    return errors;
  }

  memberTaskPlanErrors(): Record<string, boolean> {
    const errors: Record<string, boolean> = {};
    for (const member of this.selectedExecutorMembers()) {
      errors[member.userId] = this.showMemberTaskPlanError(member.userId);
    }
    return errors;
  }

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.selectedStageId.set('');
        this.selectedMemberIds.set([]);
        this.description.set('');
        this.planStartDate.set(null);
        this.planEndDate.set(null);
        this.memberTaskTitles.set({});
        this.memberTaskTemplateIds.set({});
        this.memberTaskDescriptions.set({});
        this.memberTaskPlanStartDates.set({});
        this.memberTaskPlanEndDates.set({});
        this.memberTaskTitleTouched.set({});
        this.memberTaskPlanTouched.set({});
        this.memberTouched.set(false);
        this.stageTaskTouched.set(false);
        this.submitAttempted.set(false);
        return;
      }
      const first = this.candidateStages()[0];
      this.selectedStageId.set(first?.id ?? '');
      this.selectedMemberIds.set(this.normalizeMemberIds(this.currentMemberIds()));
      this.description.set('');
      this.planStartDate.set(null);
      this.planEndDate.set(null);
      this.memberTaskTitleTouched.set({});
      this.memberTaskPlanTouched.set({});
      this.memberTouched.set(false);
      this.stageTaskTouched.set(false);
      this.submitAttempted.set(false);
    });

    effect(() => {
      if (!this.open()) {
        return;
      }
      const selectedIds = new Set(this.selectedMemberIds().map((item) => item.trim()).filter(Boolean));
      const templateIds = new Set(this.selectedTemplateTasks().map((item) => item.id));
      this.memberTaskTitles.update((current) => this.pickSelectedTaskMap(current, selectedIds));
      this.memberTaskTemplateIds.update((current) => {
        const next: Record<string, string> = {};
        for (const [userId, templateId] of Object.entries(current)) {
          if (selectedIds.has(userId) && templateIds.has(templateId)) {
            next[userId] = templateId;
          }
        }
        return next;
      });
      this.memberTaskDescriptions.update((current) => this.pickSelectedDescriptionMap(current, selectedIds));
      this.memberTaskPlanStartDates.update((current) => this.pickSelectedDateMap(current, selectedIds));
      this.memberTaskPlanEndDates.update((current) => this.pickSelectedDateMap(current, selectedIds));
      this.memberTaskTitleTouched.update((current) => this.pickSelectedBooleanMap(current, selectedIds));
      this.memberTaskPlanTouched.update((current) => this.pickSelectedBooleanMap(current, selectedIds));
    });
  }

  confirmSelection(): void {
    this.submitAttempted.set(true);
    const stageId = this.selectedStageId().trim();
    if (!stageId || this.hasMissingStageTaskTitle() || this.invalidDateRange() || this.invalidStageTaskPlanRange()) {
      return;
    }
    const description = this.description().trim();
    this.confirm.emit({
      stageId,
      memberIds: this.selectedMemberIds(),
      description: description || undefined,
      planStartAt: this.formatDate(this.planStartDate()),
      planEndAt: this.formatDate(this.planEndDate()),
      stageTasks: this.buildStageTasks(),
    });
  }

  normalizeMemberIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  onSelectedMemberIdsChange(value: unknown): void {
    this.memberTouched.set(true);
    this.selectedMemberIds.set(this.normalizeMemberIds(value));
  }

  normalizeDescription(value: unknown): string {
    return String(value ?? '').slice(0, 2000);
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  memberTaskTitle(userId: string): string {
    return this.memberTaskTitles()[userId] ?? '';
  }

  memberTaskDescription(userId: string): string | null {
    return this.memberTaskDescriptions()[userId] ?? null;
  }

  memberTaskPlanStartDate(userId: string): Date | null {
    return this.memberTaskPlanStartDates()[userId] ?? null;
  }

  memberTaskPlanEndDate(userId: string): Date | null {
    return this.memberTaskPlanEndDates()[userId] ?? null;
  }

  setMemberTaskTitle(userId: string, value: unknown): void {
    const id = userId.trim();
    if (!id) {
      return;
    }
    const title = String(value ?? '').slice(0, 200);
    const template = this.selectedTemplateTasks().find((item) => item.title === title.trim()) ?? null;
    this.memberTaskTitles.update((current) => ({ ...current, [id]: title }));
    this.memberTaskTitleTouched.update((current) => ({ ...current, [id]: true }));
    this.memberTaskTemplateIds.update((current) => {
      const next = { ...current };
      if (template) {
        next[id] = template.id;
      } else {
        delete next[id];
      }
      return next;
    });
    this.memberTaskDescriptions.update((current) => {
      const next = { ...current };
      if (template) {
        next[id] = template.description;
      } else if (!title.trim()) {
        delete next[id];
      } else {
        next[id] = null;
      }
      return next;
    });
  }

  markMemberTaskTitleTouched(userId: string): void {
    const id = userId.trim();
    if (!id) {
      return;
    }
    this.memberTaskTitleTouched.update((current) => ({ ...current, [id]: true }));
  }

  setMemberTaskPlanDate(userId: string, key: 'start' | 'end', value: unknown): void {
    const id = userId.trim();
    if (!id) {
      return;
    }
    const date = this.normalizeDate(value);
    const target = key === 'start' ? this.memberTaskPlanStartDates : this.memberTaskPlanEndDates;
    target.update((current) => ({ ...current, [id]: date }));
    this.memberTaskPlanTouched.update((current) => ({ ...current, [id]: true }));
  }

  updateDateField(key: 'planStartAt' | 'planEndAt', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'planStartAt') {
      this.planStartDate.set(date);
      return;
    }
    this.planEndDate.set(date);
  }

  private buildStageTasks(): RdInitialStageTaskInput[] {
    const titles = this.memberTaskTitles();
    const templateIds = this.memberTaskTemplateIds();
    const descriptions = this.memberTaskDescriptions();
    const plannedStartDates = this.memberTaskPlanStartDates();
    const plannedEndDates = this.memberTaskPlanEndDates();
    return this.selectedExecutorMembers()
      .map((member) => ({
        templateId: templateIds[member.userId] || null,
        title: titles[member.userId]?.trim() || '',
        description: descriptions[member.userId] ?? null,
        ownerId: member.userId,
        plannedStartAt: this.formatDate(plannedStartDates[member.userId]) || null,
        plannedEndAt: this.formatDate(plannedEndDates[member.userId]) || null,
      }))
      .filter((task) => task.title);
  }

  private pickSelectedTaskMap(current: Record<string, string>, selectedIds: Set<string>): Record<string, string> {
    const next: Record<string, string> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (selectedIds.has(userId)) {
        next[userId] = value;
      }
    }
    return next;
  }

  private pickSelectedDescriptionMap(current: Record<string, string | null>, selectedIds: Set<string>): Record<string, string | null> {
    const next: Record<string, string | null> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (selectedIds.has(userId)) {
        next[userId] = value;
      }
    }
    return next;
  }

  private pickSelectedDateMap(current: Record<string, Date | null>, selectedIds: Set<string>): Record<string, Date | null> {
    const next: Record<string, Date | null> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (selectedIds.has(userId)) {
        next[userId] = value;
      }
    }
    return next;
  }

  private pickSelectedBooleanMap(current: Record<string, boolean>, selectedIds: Set<string>): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (selectedIds.has(userId)) {
        next[userId] = value;
      }
    }
    return next;
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
