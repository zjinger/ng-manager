import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS } from '@shared/constants';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import {
  RD_TYPE_OPTIONS,
  type CreateRdItemInput,
  type RdItemType,
  type RdStageEntity,
  type RdStageTaskTemplateEntity,
} from '../../models/rd.model';

type Draft = Omit<CreateRdItemInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  stageId: null,
  type: 'feature_dev',
  priority: 'medium',
  memberIds: [],
  verifierId: null,
  planStartAt: '',
  planEndAt: '',
};

@Component({
  selector: 'app-rd-create-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzDatePickerModule,
    NzButtonModule,
    NzAutocompleteModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="'新建研发项' + (projectName() ? ' · ' + projectName() : '')"
      [subtitle]="''"
      [icon]="'rocket'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-create-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="title" nzRequired>标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="例如：登录功能开发"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="description">描述</nz-form-label>
                <nz-form-control>
                  <!-- <textarea
                    nz-input
                    rows="6"
                    placeholder="简要描述背景、目标和预期交付。"
                    [ngModel]="draft().description"
                    name="description"
                    (ngModelChange)="updateField('description', $event)"
                  ></textarea> -->
                  <app-markdown-editor
                    [ngModel]="draft().description"
                    name="description"
                    [config]="editorConfig"
                    [imageUploadHandler]="uploadMarkdownImage"
                    (contentChange)="updateField('description', $event)"
                    (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                    [placeholder]="'简要描述背景、目标和预期交付。'"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="stageId">阶段</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未选择"
                    [ngModel]="draft().stageId"
                    name="stageId"
                    (ngModelChange)="updateField('stageId', $event)"
                  >
                    @for (item of stages(); track item.id) {
                      <nz-option [nzLabel]="item.name" [nzValue]="item.id"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="type">类型</nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draft().type" name="type" (ngModelChange)="updateType($event)">
                    @for (item of typeOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="priority">优先级</nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draft().priority" name="priority" (ngModelChange)="updateField('priority', $event)">
                    @for (item of priorityOptions.slice(1); track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="memberIds">分配执行人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzMode="multiple"
                    nzAllowClear
                    nzPlaceHolder="至少选择1人，可选择多人"
                    [ngModel]="draft().memberIds"
                    name="memberIds"
                    (ngModelChange)="updateField('memberIds', $event)"
                  >
                    @for (member of members(); track member.id) {
                      <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzFor="verifierId" nzTooltipTitle="验证人负责验收确认，未指定时默认为创建人" [nzTooltipIcon]="'question-circle'">验证人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未指定"
                    [ngModel]="draft().verifierId"
                    name="verifierId"
                    (ngModelChange)="updateField('verifierId', $event)"
                  >
                    @for (member of members(); track member.id) {
                      <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzFor="planStartAt">计划开始</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    style="width:100%"
                    nzPlaceHolder="请选择日期"
                    nzFormat="yyyy-MM-dd"
                    nzPopupClassName="hub-datepicker-overlay"
                    [ngModel]="planStartDate()"
                    name="planStartAt"
                    (ngModelChange)="updateDateField('planStartAt', $event)"
                  ></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzFor="planEndAt">计划结束</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    style="width:100%"
                    nzPlaceHolder="请选择日期"
                    nzFormat="yyyy-MM-dd"
                    nzPopupClassName="hub-datepicker-overlay"
                    [ngModel]="planEndDate()"
                    name="planEndAt"
                    (ngModelChange)="updateDateField('planEndAt', $event)"
                  ></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          @if (hasInvalidPlanRange()) {
            <p class="template-preview__warning">计划开始不能晚于计划结束。</p>
          }

          <div class="template-preview">
            <div class="template-preview__header">
              <div>
                <strong>阶段任务</strong>
                <span>按执行人选择当前阶段模板任务，也可手动输入；留空则不创建。</span>
              </div>
              <span>将创建 {{ selectedInitialStageTaskCount() }} 个任务</span>
            </div>
            @if (assignedExecutorMembers().length > 0) {
              <div class="template-preview__list">
                @for (member of assignedExecutorMembers(); track member.userId) {
                  <div class="template-preview__item">
                    <span class="template-preview__owner">{{ member.displayName }}</span>
                    <div class="template-preview__task-input">
                      <input
                        nz-input
                        maxlength="200"
                        [nzAutocomplete]="taskTitleAuto"
                        [ngModel]="memberTaskTitle(member.userId)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setMemberTaskTitle(member.userId, $event)"
                        placeholder="选择模板或手动输入任务"
                      />
                      <nz-autocomplete #taskTitleAuto [nzDefaultActiveFirstOption]="false">
                        @for (task of selectedStageTemplateTasks(); track task.id) {
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
                      @if (memberTaskDescription(member.userId); as description) {
                        <small>{{ description }}</small>
                      }
                    </div>
                    <div class="template-preview__date-range">
                      <nz-date-picker
                        nzFormat="yyyy-MM-dd"
                        nzPlaceHolder="计划开始"
                        nzPopupClassName="hub-datepicker-overlay"
                        [ngModel]="memberTaskPlanStartDate(member.userId)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setMemberTaskPlanDate(member.userId, 'start', $event)"
                      ></nz-date-picker>
                      <nz-date-picker
                        nzFormat="yyyy-MM-dd"
                        nzPlaceHolder="计划结束"
                        nzPopupClassName="hub-datepicker-overlay"
                        [ngModel]="memberTaskPlanEndDate(member.userId)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setMemberTaskPlanDate(member.userId, 'end', $event)"
                      ></nz-date-picker>
                    </div>
                  </div>
                }
              </div>
              @if (hasInvalidStageTaskPlanRange()) {
                <p class="template-preview__warning">阶段任务计划时间必须在研发项计划开始和计划结束之间，且开始不能晚于结束。</p>
              }
              @if (selectedStageTemplateTasks().length === 0) {
                <p class="template-preview__hint">当前阶段未配置任务模板，可直接手动输入阶段任务。</p>
              }
            } @else {
              <p class="template-preview__empty">选择分配执行人后，可按执行人新增当前阶段任务。</p>
            }
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" [disabled]="!isFormValid()" [nzLoading]="busy()" type="submit" form="rd-create-form">
            <nz-icon nzType="check" nzTheme="outline" />
            创建研发项
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .template-preview {
        margin: 2px 0 16px;
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
      .template-preview__header strong {
        color: var(--text-heading);
        font-size: 13px;
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
      .template-preview__warning {
        margin: 0 0 10px;
        color: var(--danger);
        font-size: 12px;
      }
      .template-preview__hint {
        margin-top: 8px;
      }
      @media (max-width: 768px) {
        .template-preview__header {
          align-items: flex-start;
          flex-direction: column;
        }
        .template-preview__item {
          grid-template-columns: 1fr;
        }
        .template-preview__date-range {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdCreateDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();
  readonly projectName = input<string>('');

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly typeOptions = RD_TYPE_OPTIONS;
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly planStartDate = signal<Date | null>(null);
  readonly planEndDate = signal<Date | null>(null);
  readonly memberTaskTitles = signal<Record<string, string>>({});
  readonly memberTaskTemplateIds = signal<Record<string, string>>({});
  readonly memberTaskDescriptions = signal<Record<string, string | null>>({});
  readonly memberTaskPlanStartDates = signal<Record<string, Date | null>>({});
  readonly memberTaskPlanEndDates = signal<Record<string, Date | null>>({});
  readonly selectedStageTemplateTasks = computed(() => {
    const stageId = this.draft().stageId?.trim();
    if (!stageId) {
      return [];
    }
    return this.stageTaskTemplates()
      .filter((item) => item.stageId === stageId && item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  });
  readonly assignedExecutorMembers = computed(() => {
    const assignedIds = new Set((this.draft().memberIds ?? []).map((item) => item.trim()).filter(Boolean));
    if (assignedIds.size === 0) {
      return [];
    }
    return this.members().filter((member) => assignedIds.has(member.userId));
  });
  readonly selectedInitialStageTaskCount = computed(() => {
    const titles = this.memberTaskTitles();
    return this.assignedExecutorMembers().filter((member) => titles[member.userId]?.trim()).length;
  });
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'article-editor',
    status: ['lines', 'words']
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => {
    return this.imageUpload.uploadImage(file);
  };

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
        this.planStartDate.set(null);
        this.planEndDate.set(null);
        this.memberTaskTitles.set({});
        this.memberTaskTemplateIds.set({});
        this.memberTaskDescriptions.set({});
        this.memberTaskPlanStartDates.set({});
        this.memberTaskPlanEndDates.set({});
      }
    });

    effect(() => {
      if (!this.open()) {
        return;
      }
      const assignedIds = new Set((this.draft().memberIds ?? []).map((item) => item.trim()).filter(Boolean));
      this.memberTaskTitles.update((current) => this.pickAssignedTaskMap(current, assignedIds));
      this.memberTaskTemplateIds.update((current) => this.pickAssignedTaskMap(current, assignedIds));
      this.memberTaskDescriptions.update((current) => {
        const next: Record<string, string | null> = {};
        for (const [userId, description] of Object.entries(current)) {
          if (assignedIds.has(userId)) {
            next[userId] = description;
          }
        }
        return next;
      });
      this.memberTaskPlanStartDates.update((current) => this.pickAssignedDateMap(current, assignedIds));
      this.memberTaskPlanEndDates.update((current) => this.pickAssignedDateMap(current, assignedIds));
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  isFormValid(): boolean {
    return this.draft().title.trim().length > 0
      && this.draft().stageId !== null
      && this.draft().priority !== null
      && this.draft().type !== null
      && (this.draft().memberIds?.length ?? 0) > 0
      && !this.hasInvalidPlanRange()
      && !this.hasInvalidStageTaskPlanRange();
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: RdItemType): void {
    this.updateField('type', value);
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
    const template = this.selectedStageTemplateTasks().find((item) => item.title === title.trim()) ?? null;
    this.memberTaskTitles.update((current) => ({ ...current, [id]: title }));
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

  updateDateField(key: 'planStartAt' | 'planEndAt', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'planStartAt') {
      this.planStartDate.set(date);
    } else {
      this.planEndDate.set(date);
    }
    this.updateField(key, this.formatDate(date));
  }

  setMemberTaskPlanDate(userId: string, key: 'start' | 'end', value: unknown): void {
    const id = userId.trim();
    if (!id) {
      return;
    }
    const date = this.normalizeDate(value);
    const target = key === 'start' ? this.memberTaskPlanStartDates : this.memberTaskPlanEndDates;
    target.update((current) => ({ ...current, [id]: date }));
  }

  hasInvalidPlanRange(): boolean {
    const start = this.planStartDate();
    const end = this.planEndDate();
    return !!start && !!end && start.getTime() > end.getTime();
  }

  hasInvalidStageTaskPlanRange(): boolean {
    const itemStart = this.planStartDate();
    const itemEnd = this.planEndDate();
    const titles = this.memberTaskTitles();
    for (const member of this.assignedExecutorMembers()) {
      if (!titles[member.userId]?.trim()) {
        continue;
      }
      const start = this.memberTaskPlanStartDate(member.userId);
      const end = this.memberTaskPlanEndDate(member.userId);
      if (!start && !end) {
        continue;
      }
      if (!itemStart || !itemEnd) {
        return true;
      }
      if (start && end && start.getTime() > end.getTime()) {
        return true;
      }
      if (start && (start.getTime() < itemStart.getTime() || start.getTime() > itemEnd.getTime())) {
        return true;
      }
      if (end && (end.getTime() < itemStart.getTime() || end.getTime() > itemEnd.getTime())) {
        return true;
      }
    }
    return false;
  }

  private formatDate(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = this.normalizeDate(value);
    if (!date) {
      return '';
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDate(value: unknown): Date | null {
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

  submitForm(): void {
    if (!this.draft().title.trim()) {
      return;
    }
    this.create.emit({
      ...this.draft(),
      title: this.draft().title.trim(),
      stageTasks: this.buildInitialStageTasks(),
    });
  }

  private buildInitialStageTasks(): NonNullable<Draft['stageTasks']> {
    const titles = this.memberTaskTitles();
    const templateIds = this.memberTaskTemplateIds();
    const descriptions = this.memberTaskDescriptions();
    const plannedStartDates = this.memberTaskPlanStartDates();
    const plannedEndDates = this.memberTaskPlanEndDates();
    return this.assignedExecutorMembers()
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

  private pickAssignedTaskMap<T extends string>(current: Record<string, T>, assignedIds: Set<string>): Record<string, T> {
    const next: Record<string, T> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (assignedIds.has(userId)) {
        next[userId] = value as T;
      }
    }
    return next;
  }

  private pickAssignedDateMap(current: Record<string, Date | null>, assignedIds: Set<string>): Record<string, Date | null> {
    const next: Record<string, Date | null> = {};
    for (const [userId, value] of Object.entries(current)) {
      if (assignedIds.has(userId)) {
        next[userId] = value;
      }
    }
    return next;
  }
}
