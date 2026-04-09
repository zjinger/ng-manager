import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS } from '@shared/constants';
import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MarkdownImageUploadService } from '../../../../shared/services/markdown-image-upload.service';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { CreateRdItemInput, RdItemType, RdStageEntity } from '../../models/rd.model';

type Draft = Omit<CreateRdItemInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  stageId: null,
  type: 'feature_dev',
  priority: 'medium',
  assigneeId: null,
  reviewerId: null,
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
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    DialogShellComponent,
    FormActionsComponent,
    // MarkdownEditorComponent
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
                    placeholder="例如：Dashboard 暗黑主题验收收口"
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
                  <textarea
                    nz-input
                    rows="6"
                    placeholder="简要描述背景、目标和预期交付。"
                    [ngModel]="draft().description"
                    name="description"
                    (ngModelChange)="updateField('description', $event)"
                  ></textarea>
                  <!-- <app-markdown-editor
                    [minHeight]="'240px'"
                    [ngModel]="draft().description"
                    name="description"
                    [config]="editorConfig"
                    [imageUploadHandler]="uploadMarkdownImage"
                    (contentChange)="updateField('description', $event)"
                    (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                    [placeholder]="'简要描述背景、目标和预期交付。'"
                  /> -->
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
                    <nz-option nzLabel="功能开发" nzValue="feature_dev"></nz-option>
                    <nz-option nzLabel="技术改造" nzValue="tech_refactor"></nz-option>
                    <nz-option nzLabel="联调协作" nzValue="integration"></nz-option>
                    <nz-option nzLabel="环境准备" nzValue="env_setup"></nz-option>
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
                <nz-form-label nzRequired nzFor="assigneeId">执行人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未指派"
                    [ngModel]="draft().assigneeId"
                    name="assigneeId"
                    (ngModelChange)="updateField('assigneeId', $event)"
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
                <nz-form-label nzFor="reviewerId" nzTooltipTitle="确认人默认为执行人" [nzTooltipIcon]="'question-circle'">确认人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未指定"
                    [ngModel]="draft().reviewerId"
                    name="reviewerId"
                    (ngModelChange)="updateField('reviewerId', $event)"
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
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdCreateDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly markdownImageUpload = inject(MarkdownImageUploadService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();
  readonly projectName = input<string>('');

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly planStartDate = signal<Date | null>(null);
  readonly planEndDate = signal<Date | null>(null);
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'article-editor',
    status: ['lines', 'words']
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => {
    return this.markdownImageUpload.uploadImage(file);
  };

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
        this.planStartDate.set(null);
        this.planEndDate.set(null);
      }
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  isFormValid(): boolean {
    return this.draft().title.trim().length > 0 && this.draft().stageId !== null && this.draft().priority !== null && this.draft().type !== null && this.draft().assigneeId !== null;
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: RdItemType): void {
    this.updateField('type', value);
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
    });
  }
}
