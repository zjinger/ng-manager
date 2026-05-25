import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { AuthUser } from '@core/auth';
import { UPLOAD_TARGETS } from '@shared/constants';
import { DialogShellComponent, FileUploadDropzoneComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import type { ProjectSummary } from '../../../projects/models/project.model';
import type { UserEntity } from '../../../users/models/user.model';
import {
  RD_TASK_SHEET_BUSINESS_TYPE_OPTIONS,
  type CreateRdTaskSheetInput,
  type RdTaskSheetBusinessType,
  type RdTaskSheetDetail,
  type RdTaskSheetUrgency,
} from '../../models/rd-task-sheet.model';

type Draft = Omit<CreateRdTaskSheetInput, 'attachments'>;

const DEFAULT_DRAFT: Draft = {
  projectId: null,
  sheetNo: '',
  title: '',
  issueDate: todayString(),
  issuerDepartment: '',
  issuerUserId: null,
  issuerName: '',
  receiverDepartment: '',
  receiverUserId: null,
  receiverName: '',
  receiverPhone: '',
  processorUserId: null,
  customerCompany: '',
  customerContact: '',
  customerPhone: '',
  projectName: '',
  projectContact: '',
  relatedSystem: '',
  urgency: 'normal',
  businessType: 'technical_service',
  expectedResolvedAt: '',
  resolvedAt: '',
  result: null,
  businessDescription: '',
  deliveryContent: '',
};

@Component({
  selector: 'app-rd-task-sheet-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzDatePickerModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzRadioModule,
    NzSelectModule,
    DialogShellComponent,
    FileUploadDropzoneComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="920"
      [title]="initial() ? '编辑任务单' : '新建任务单'"
      [subtitle]="'任务单可关联项目，也可作为独立任务流转。'"
      [icon]="'schedule'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-task-sheet-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div class="sheet-title">天津天元海科技开发有限公司业务联络单</div>

          <section class="sheet-grid">
            <div class="sheet-label">日期</div>
            <div class="sheet-field">
              <nz-date-picker
                class="field-full"
                nzFormat="yyyy 年 MM 月 dd 日"
                [ngModel]="issueDate()"
                name="issueDate"
                (ngModelChange)="updateDateField('issueDate', $event)"
              />
            </div>
            <div class="sheet-label">编号</div>
            <div class="sheet-field">
              <input nz-input placeholder="未填写时自动生成" [ngModel]="draft().sheetNo" name="sheetNo" (ngModelChange)="updateField('sheetNo', $event)" />
            </div>

            <div class="sheet-label">发起部门</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().issuerDepartment" name="issuerDepartment" (ngModelChange)="updateField('issuerDepartment', $event)" />
            </div>
            <div class="sheet-label">接收部门</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().receiverDepartment" name="receiverDepartment" (ngModelChange)="updateField('receiverDepartment', $event)" />
            </div>

            <div class="sheet-label">发起人</div>
            <div class="sheet-field">
              <nz-select
                style="width: 100%"
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="选择账号"
                [ngModel]="draft().issuerUserId"
                name="issuerUserId"
                (ngModelChange)="selectUser('issuer', $event)"
              >
                @for (user of users(); track user.id) {
                  <nz-option [nzLabel]="userName(user)" [nzValue]="user.id"></nz-option>
                }
              </nz-select>
            </div>
            <div class="sheet-label">接收人</div>
            <div class="sheet-field sheet-field--stacked">
              <nz-select
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="选择账号"
                [ngModel]="draft().receiverUserId"
                name="receiverUserId"
                (ngModelChange)="selectUser('receiver', $event)"
              >
                @for (user of users(); track user.id) {
                  <nz-option [nzLabel]="userName(user)" [nzValue]="user.id"></nz-option>
                }
              </nz-select>
              <input nz-input placeholder="联系电话" [ngModel]="draft().receiverPhone" name="receiverPhone" (ngModelChange)="updateField('receiverPhone', $event)" />
            </div>

            <div class="sheet-label">客户单位</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().customerCompany" name="customerCompany" (ngModelChange)="updateField('customerCompany', $event)" />
            </div>
            <div class="sheet-label">客户联系人</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().customerContact" name="customerContact" (ngModelChange)="updateField('customerContact', $event)" />
            </div>

            <div class="sheet-label">项目名称</div>
            <div class="sheet-field">
              <input
                nz-input
                maxlength="160"
                placeholder="例如：xx系统升级/xx功能开发/xx协议变更等"
                [ngModel]="draft().projectName"
                name="projectName"
                (ngModelChange)="updateProjectName($event)"
              />
            </div>
            <div class="sheet-label">客户联系方式</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().customerPhone" name="customerPhone" (ngModelChange)="updateField('customerPhone', $event)" />
            </div>

            <div class="sheet-label">项目联系人</div>
            <div class="sheet-field">
              <input nz-input [ngModel]="draft().projectContact" name="projectContact" (ngModelChange)="updateField('projectContact', $event)" />
            </div>
            <div class="sheet-label">相关系统</div>
            <div class="sheet-field">
              <nz-select
                nzShowSearch
                style="width: 100%"
                nzAllowClear
                nzPlaceHolder="不关联系统可不填"
                [ngModel]="draft().projectId"
                name="projectId"
                (ngModelChange)="updateField('projectId', $event || null)"
              >
                @for (project of projects(); track project.id) {
                  <nz-option [nzLabel]="project.name" [nzValue]="project.id"></nz-option>
                }
              </nz-select>
            </div>

            <div class="sheet-label">紧急程度</div>
            <div class="sheet-field">
              <nz-radio-group [ngModel]="draft().urgency" name="urgency" (ngModelChange)="updateUrgency($event)">
                <label nz-radio nzValue="normal">一般</label>
                <label nz-radio nzValue="urgent">紧急</label>
              </nz-radio-group>
            </div>
            <div class="sheet-label">期望解决时间</div>
            <div class="sheet-field">
              <nz-date-picker
                class="field-full"
                nzFormat="yyyy 年 MM 月 dd 日"
                [ngModel]="expectedResolvedDate()"
                name="expectedResolvedAt"
                (ngModelChange)="updateDateField('expectedResolvedAt', $event)"
              />
            </div>

            <div class="sheet-label">业务类型</div>
            <div class="sheet-field sheet-field--wide">
              <nz-radio-group [ngModel]="draft().businessType" name="businessType" (ngModelChange)="updateBusinessType($event)">
                @for (option of businessTypeOptions; track option.value) {
                  <label nz-radio [nzValue]="option.value">{{ option.label }}</label>
                }
              </nz-radio-group>
            </div>
          </section>

          <section class="sheet-section sheet-section--description">
            <div class="sheet-section__label">
              <span>业务描述</span>
            </div>
            <div class="sheet-section__body">
              <app-markdown-editor
                [ngModel]="draft().businessDescription"
                name="businessDescription"
                [config]="editorConfig"
                [imageUploadHandler]="uploadMarkdownImage"
                minHeight="260px"
                [placeholder]="'填写需求背景、变更范围、交付要求等内容。'"
                (contentChange)="updateField('businessDescription', $event)"
                (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
              />
            </div>
          </section>

          @if (!initial()) {
            <section class="sheet-section">
              <div class="sheet-section__label">附件</div>
              <div class="sheet-section__body">
                <app-file-upload-dropzone
                  [policy]="attachmentUploadPolicy"
                  [files]="attachmentFiles()"
                  [disabled]="busy()"
                  [hint]="'支持 Word / PDF / JPG / PNG，单个文件最大 10MB'"
                  (filesChange)="attachmentFiles.set($event)"
                />
              </div>
            </section>
          }
        </form>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" form="rd-task-sheet-form" [disabled]="!isFormValid()" [nzLoading]="busy()">
          <nz-icon nzType="check" />
          {{ initial() ? '保存' : '创建任务单' }}
        </button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  styles: [
    `
      .field-full {
        width: 100%;
      }
      .sheet-title {
        margin: 4px 0 14px;
        text-align: center;
        color: var(--text-heading);
        font-size: 18px;
        font-weight: 700;
      }
      .sheet-grid {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr) 96px minmax(0, 1fr);
        border: 1px solid var(--border-color);
        border-bottom: 0;
        background: var(--surface-card);
      }
      .sheet-label,
      .sheet-field {
        min-height: 46px;
        border-right: 1px solid var(--border-color-soft);
        border-bottom: 1px solid var(--border-color-soft);
      }
      .sheet-label {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        color: var(--text-muted);
        background: var(--surface-subtle);
        font-size: 13px;
        text-align: center;
      }
      .sheet-field {
        padding: 6px 8px;
      }
      .sheet-field :where(nz-radio-group, .ant-radio-group) {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
      }
      .sheet-field--wide :where(nz-radio-group, .ant-radio-group) {
        flex-wrap: wrap;
        row-gap: 6px;
      }
      .sheet-field:nth-child(4n) {
        border-right: 0;
      }
      .sheet-field--wide {
        grid-column: span 3;
        border-right: 0;
      }
      .sheet-field--stacked {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
        gap: 8px;
      }
      .sheet-section {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        border: 1px solid var(--border-color);
        border-top: 0;
      }
      .sheet-section__label,
      .sheet-section__body {
        border-right: 1px solid var(--border-color-soft);
        padding: 10px 8px;
      }
      .sheet-section__label {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--text-muted);
        background: var(--surface-subtle);
        font-size: 13px;
        text-align: center;
      }
      .sheet-section__label small {
        max-width: 72px;
        color: var(--text-tertiary);
        font-size: 12px;
        line-height: 1.45;
      }
      .sheet-section__body {
        border-right: 0;
      }
      .sheet-section--description .sheet-section__body {
        min-height: 300px;
      }
      @media (max-width: 760px) {
        .sheet-grid,
        .sheet-section {
          grid-template-columns: 88px minmax(0, 1fr);
        }
        .sheet-field:nth-child(4n) {
          border-right: 1px solid var(--border-color-soft);
        }
        .sheet-label:nth-of-type(odd),
        .sheet-field {
          border-right: 0;
        }
        .sheet-field--wide {
          grid-column: span 1;
        }
        .sheet-field--stacked {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly initial = input<RdTaskSheetDetail | null>(null);
  readonly prefill = input<CreateRdTaskSheetInput | null>(null);
  readonly currentUser = input<AuthUser | null>(null);
  readonly projects = input<ProjectSummary[]>([]);
  readonly users = input<UserEntity[]>([]);
  readonly save = output<{ id?: string; value: CreateRdTaskSheetInput; files: File[] }>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly attachmentFiles = signal<File[]>([]);
  readonly issueDate = signal<Date | null>(new Date());
  readonly expectedResolvedDate = signal<Date | null>(null);

  readonly businessTypeOptions = RD_TASK_SHEET_BUSINESS_TYPE_OPTIONS;
  readonly attachmentUploadPolicy = UPLOAD_TARGETS.taskSheetAttachment;
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'rd-task-sheet-editor',
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => this.imageUpload.uploadImage(file);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const initial = this.initial();
      if (initial) {
        this.setDraftFromDetail(initial);
        return;
      }
      const prefill = this.prefill();
      if (prefill) {
        this.setDraftFromInput(prefill);
        return;
      }
      this.setDraftForCreate();
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateProjectName(value: string): void {
    this.draft.update((draft) => ({
      ...draft,
      projectName: value,
      title: value,
    }));
  }

  updateUrgency(value: RdTaskSheetUrgency): void {
    this.updateField('urgency', value);
  }

  updateBusinessType(value: RdTaskSheetBusinessType): void {
    this.updateField('businessType', value);
  }

  updateDateField(key: 'issueDate' | 'expectedResolvedAt', value: unknown): void {
    const date = normalizeDate(value);
    if (key === 'issueDate') {
      this.issueDate.set(date);
    } else {
      this.expectedResolvedDate.set(date);
    }
    this.updateField(key, formatDate(date));
  }

  selectUser(kind: 'issuer' | 'receiver', userId: string | null): void {
    const user = this.users().find((item) => item.id === userId) ?? null;
    if (kind === 'issuer') {
      this.draft.update((draft) => ({
        ...draft,
        issuerUserId: user?.id ?? null,
        issuerName: user ? this.userName(user) : '',
        issuerDepartment: user?.primaryDepartment?.departmentName ?? '',
      }));
      return;
    }
    this.draft.update((draft) => ({
      ...draft,
      receiverUserId: user?.id ?? null,
      receiverName: user ? this.userName(user) : '',
      receiverPhone: user?.mobile ?? '',
      receiverDepartment: user?.primaryDepartment?.departmentName ?? '',
    }));
  }

  userName(user: UserEntity): string {
    return user.displayName || user.username;
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  isFormValid(): boolean {
    return Boolean((this.draft().projectName || this.draft().title).trim() && this.draft().businessDescription.trim());
  }

  submitForm(): void {
    if (!this.isFormValid()) {
      return;
    }
    const initial = this.initial();
    this.save.emit({
      id: initial?.id,
      value: sanitizeDraft(this.draft()),
      files: initial ? [] : this.attachmentFiles(),
    });
  }

  private setDraftForCreate(): void {
    const current = this.currentUser();
    const today = todayString();
    this.issueDate.set(parseDate(today));
    this.expectedResolvedDate.set(null);
    this.attachmentFiles.set([]);
    this.draft.set({
      ...DEFAULT_DRAFT,
      issueDate: today,
      issuerUserId: current?.userId ?? null,
      issuerName: current?.nickname || current?.username || '',
      issuerDepartment: current?.department?.name ?? '',
    });
  }

  private setDraftFromDetail(detail: RdTaskSheetDetail): void {
    this.issueDate.set(parseDate(detail.issueDate));
    this.expectedResolvedDate.set(parseDate(detail.expectedResolvedAt));
    this.attachmentFiles.set([]);
    this.draft.set({
      projectId: detail.projectId,
      sheetNo: detail.sheetNo,
      title: detail.title,
      issueDate: detail.issueDate,
      issuerDepartment: detail.issuerDepartment,
      issuerUserId: detail.issuerUserId,
      issuerName: detail.issuerName,
      receiverDepartment: detail.receiverDepartment,
      receiverUserId: detail.receiverUserId,
      receiverName: detail.receiverName,
      receiverPhone: detail.receiverPhone,
      processorUserId: detail.processorUserId,
      customerCompany: detail.customerCompany,
      customerContact: detail.customerContact,
      customerPhone: detail.customerPhone,
      projectName: detail.projectName || detail.title,
      projectContact: detail.projectContact,
      relatedSystem: detail.relatedSystem,
      urgency: detail.urgency,
      businessType: detail.businessType,
      expectedResolvedAt: detail.expectedResolvedAt,
      resolvedAt: detail.resolvedAt,
      result: detail.result,
      businessDescription: detail.businessDescription,
      deliveryContent: detail.deliveryContent,
    });
  }

  private setDraftFromInput(input: CreateRdTaskSheetInput): void {
    const issueDate = input.issueDate || todayString();
    this.issueDate.set(parseDate(issueDate));
    this.expectedResolvedDate.set(parseDate(input.expectedResolvedAt));
    this.attachmentFiles.set([]);
    this.draft.set({
      ...DEFAULT_DRAFT,
      ...input,
      issueDate,
      projectId: input.projectId ?? null,
      sheetNo: input.sheetNo ?? '',
      title: input.title || input.projectName || '',
      projectName: input.projectName || input.title || '',
      expectedResolvedAt: input.expectedResolvedAt ?? '',
      resolvedAt: input.resolvedAt ?? '',
      result: input.result ?? null,
      deliveryContent: input.deliveryContent ?? '',
    });
  }
}

function sanitizeDraft(draft: Draft): CreateRdTaskSheetInput {
  const projectName = textOrNull(draft.projectName);
  return {
    projectId: textOrNull(draft.projectId),
    sheetNo: textOrNull(draft.sheetNo),
    title: projectName || draft.title.trim(),
    issueDate: draft.issueDate?.trim() || undefined,
    issuerDepartment: textOrNull(draft.issuerDepartment),
    issuerUserId: textOrNull(draft.issuerUserId),
    issuerName: textOrNull(draft.issuerName),
    receiverDepartment: textOrNull(draft.receiverDepartment),
    receiverUserId: textOrNull(draft.receiverUserId),
    receiverName: textOrNull(draft.receiverName),
    receiverPhone: textOrNull(draft.receiverPhone),
    processorUserId: textOrNull(draft.processorUserId),
    customerCompany: textOrNull(draft.customerCompany),
    customerContact: textOrNull(draft.customerContact),
    customerPhone: textOrNull(draft.customerPhone),
    projectName,
    projectContact: textOrNull(draft.projectContact),
    relatedSystem: textOrNull(draft.relatedSystem),
    urgency: draft.urgency,
    businessType: draft.businessType,
    expectedResolvedAt: textOrNull(draft.expectedResolvedAt),
    resolvedAt: textOrNull(draft.resolvedAt),
    result: draft.result,
    businessDescription: draft.businessDescription.trim(),
    deliveryContent: textOrNull(draft.deliveryContent),
  };
}

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    return parseDate(value);
  }
  return null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayString(): string {
  return formatDate(new Date());
}

function textOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
