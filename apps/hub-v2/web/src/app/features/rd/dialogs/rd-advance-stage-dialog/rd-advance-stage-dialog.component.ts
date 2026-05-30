import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdInitialStageTaskInput, RdItemEntity, RdStageEntity, RdStageTaskTemplateEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-advance-stage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzAutocompleteModule,
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
                  <nz-form-control>
                    <nz-select
                      nzMode="multiple"
                      nzShowSearch
                      nzPlaceHolder="选择下一阶段成员（默认沿用当前成员）"
                      [ngModel]="selectedMemberIds()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="selectedMemberIds.set(normalizeMemberIds($event))"
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
                      [placeholder]="'可选：填写本次推进说明（会记录到研发动态）'"
                      minHeight="160px"
                      (contentChange)="description.set(normalizeDescription($event))"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>计划开始</nz-form-label>
                  <nz-form-control>
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
                  <nz-form-control>
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

            <div class="template-preview">
              <div class="template-preview__header">
                <div>
                  <strong>{{ selectedStageName() }}阶段任务</strong>
                  <span>按执行人选择当前阶段模板任务，也可手动输入；留空则不创建。</span>
                </div>
                <span>将创建 {{ selectedStageTaskCount() }} 个任务</span>
              </div>
              @if (selectedExecutorMembers().length > 0) {
                <div class="template-preview__list">
                  @for (member of selectedExecutorMembers(); track member.userId) {
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
                          @for (task of selectedTemplateTasks(); track task.id) {
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
                        @if (memberTaskDescription(member.userId); as taskDescription) {
                          <small>{{ taskDescription }}</small>
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
                @if (invalidStageTaskPlanRange()) {
                  <p class="template-preview__warning">阶段任务计划时间必须在下一阶段计划开始和计划结束之间，且开始不能晚于结束。</p>
                }
                @if (selectedTemplateTasks().length === 0) {
                  <p class="template-preview__empty">该阶段未配置任务模板，可直接手动输入阶段任务。</p>
                }
              } @else {
                <p class="template-preview__empty">选择执行人后，可按执行人配置下一阶段任务。</p>
              }
            </div>
          </form>

          @if (invalidDateRange()) {
            <p class="empty">计划开始不能晚于计划结束。</p>
          }
          @if (selectedMemberIds().length === 0) {
            <p class="empty">请至少选择 1 名执行人。</p>
          }
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
            [disabled]="busy() || !selectedStageId() || selectedMemberIds().length === 0 || invalidDateRange() || invalidStageTaskPlanRange()"
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
      .template-preview {
        margin-top: 12px;
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
      .template-preview__header strong {
        color: var(--text-heading);
        font-size: 13px;
      }
      .template-preview__header div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .template-preview__header span,
      .template-preview__empty {
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
      .template-preview__empty {
        margin: 0;
      }
      .template-preview__warning {
        margin: 8px 0 0;
        color: var(--danger);
        font-size: 12px;
      }
      @media (max-width: 768px) {
        .advance-form [nz-col] {
          width: 100%;
          max-width: 100%;
          flex: 0 0 100%;
        }
        .template-preview__header {
          align-items: flex-start;
          flex-direction: column;
        }
        .template-preview__list {
          grid-template-columns: 1fr;
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
export class RdAdvanceStageDialogComponent {
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
    const itemStart = this.planStartDate();
    const itemEnd = this.planEndDate();
    const titles = this.memberTaskTitles();
    for (const member of this.selectedExecutorMembers()) {
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
        return;
      }
      const first = this.candidateStages()[0];
      this.selectedStageId.set(first?.id ?? '');
      this.selectedMemberIds.set(this.normalizeMemberIds(this.currentMemberIds()));
      this.description.set('');
      this.planStartDate.set(null);
      this.planEndDate.set(null);
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
    });
  }

  confirmSelection(): void {
    const stageId = this.selectedStageId().trim();
    if (!stageId || this.invalidDateRange() || this.invalidStageTaskPlanRange()) {
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

  normalizeDescription(value: unknown): string {
    return String(value ?? '').slice(0, 2000);
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

  setMemberTaskPlanDate(userId: string, key: 'start' | 'end', value: unknown): void {
    const id = userId.trim();
    if (!id) {
      return;
    }
    const date = this.normalizeDate(value);
    const target = key === 'start' ? this.memberTaskPlanStartDates : this.memberTaskPlanEndDates;
    target.update((current) => ({ ...current, [id]: date }));
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
