import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { AvatarImageNormalizerService } from '@shared/services/avatar-image-normalizer.service';
import { DialogShellComponent } from '@shared/ui';
import { PROJECT_TYPE_OPTIONS, type CreateProjectInput, type ProjectType } from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';

type CreateProjectDraft = {
  name: string;
  projectNo: string;
  projectType: ProjectType | '';
  displayCode: string;
  description: string;
  icon: string;
  avatarUploadId: string;
  contractNo: string;
  deliveryDate: string;
  visibility: 'internal' | 'private';
};

const DEFAULT_DRAFT: CreateProjectDraft = {
  name: '',
  projectNo: '',
  projectType: '',
  displayCode: '',
  description: '',
  icon: '',
  avatarUploadId: '',
  contractNo: '',
  deliveryDate: '',
  visibility: 'private',
};

@Component({
  selector: 'app-project-create-dialog',
  standalone: true,
  imports: [FormsModule, NzGridModule, NzButtonModule, NzIconModule, NzFormModule, NzInputModule, NzSelectModule, NzDatePickerModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="820"
      [title]="'新建项目'"
      [subtitle]="''"
      [icon]="'folder-add'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'">
          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>项目名称</nz-form-label>
                <nz-form-control nzErrorTip="请输入项目名称">
                  <input nz-input required="true" [ngModel]="draft().name" name="name" (ngModelChange)="updateField('name', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label
                  nzRequired
                  nzTooltipTitle="项目内部编号，唯一且必填"
                  [nzTooltipIcon]="'question-circle'"
                >
                  项目编号
                </nz-form-label>
                <nz-form-control nzErrorTip="请输入项目编号">
                  <input
                    nz-input
                    required="true"
                    placeholder="例如 PROJ-2026-001"
                    [ngModel]="draft().projectNo"
                    maxlength="64"
                    name="projectNo"
                    (ngModelChange)="updateField('projectNo', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>项目类型</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzPlaceHolder="请选择项目类型"
                    [ngModel]="draft().projectType"
                    name="projectType"
                    (ngModelChange)="updateField('projectType', $event || '')"
                  >
                    @for (item of projectTypeOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired nzTooltipTitle="内部：所有登录用户可查看（仅成员可维护）；私有：仅项目成员可查看和维护" [nzTooltipIcon]="'question-circle'">
                  可见性
                </nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draft().visibility" name="visibility" (ngModelChange)="updateField('visibility', $event)">
                    <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                    <nz-option nzLabel="私有" nzValue="private"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzTooltipTitle="即项目缩写，应用在工单编号上，规则：全大写，最多 3 个字符（A-Z/0-9）" [nzTooltipIcon]="'question-circle'">
                  项目标识
                </nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    placeholder="可选，默认按项目名生成"
                    [ngModel]="draft().displayCode"
                    maxlength="3"
                    name="displayCode"
                    (ngModelChange)="updateField('displayCode', $event)"
                  />
                  @if (displayCodeInvalid()) {
                    <span class="project-display-code-error">项目标识需为全大写，且最多 3 位（A-Z/0-9）</span>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>合同编号</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    placeholder="可选，例如 HT-2026-001"
                    [ngModel]="draft().contractNo"
                    name="contractNo"
                    (ngModelChange)="updateField('contractNo', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>交付时间</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    style="width: 100%"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="可选"
                    [ngModel]="deliveryDateValue()"
                    name="deliveryDate"
                    (ngModelChange)="updateDeliveryDate($event)"
                  ></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label>项目描述</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="4"
                    placeholder="描述项目的业务边界、协作对象或当前阶段。"
                    [ngModel]="draft().description"
                    name="description"
                    (ngModelChange)="updateField('description', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzFor="avatar">项目图标</nz-form-label>
                <nz-form-control>
                  <div class="project-avatar-field">
                    <span class="project-avatar-preview">
                      @if (avatarPreviewUrl()) {
                        <img [src]="avatarPreviewUrl()!" alt="project avatar" />
                      } @else {
                        {{ (draft().name || '项目').slice(0, 3) }}
                      }
                    </span>
                    <input #avatarInput type="file" [accept]="avatarUploadPolicy.accept" hidden (change)="onAvatarPicked($event)" />
                    <button nz-button type="button" [nzLoading]="avatarUploading()" (click)="avatarInput.click()">上传图标</button>
                    @if (draft().avatarUploadId) {
                      <button nz-button nzType="default" type="button" (click)="clearAvatar()">移除</button>
                    }
                  </div>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" (click)="submitForm()" [disabled]="!canSubmit()" type="submit">
          <nz-icon nzType="check" nzTheme="outline" />
          创建项目
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .project-avatar-field {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .project-avatar-preview {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
      }
      .project-avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .project-display-code-error {
        display: inline-block;
        margin-top: 6px;
        color: var(--color-danger);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateDialogComponent {
  private readonly projectApi = inject(ProjectApiService);
  private readonly message = inject(NzMessageService);
  private readonly avatarNormalizer = inject(AvatarImageNormalizerService);
  readonly avatarUploadPolicy = UPLOAD_TARGETS.projectAvatar;

  readonly open = input(false);
  readonly busy = input(false);
  readonly create = output<CreateProjectInput>();
  readonly cancel = output<void>();

  readonly projectTypeOptions = PROJECT_TYPE_OPTIONS;
  readonly draft = signal<CreateProjectDraft>({ ...DEFAULT_DRAFT });
  readonly deliveryDateValue = signal<Date | null>(null);
  readonly avatarUploading = signal(false);
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly displayCodeInvalid = computed(() => {
    const value = this.draft().displayCode?.trim() || '';
    return value.length > 0 && !/^[A-Z0-9]{1,3}$/.test(value);
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
        this.deliveryDateValue.set(null);
        this.avatarUploading.set(false);
        this.avatarPreviewUrl.set(null);
      }
    });
  }

  updateField<K extends keyof CreateProjectDraft>(key: K, value: CreateProjectDraft[K]): void {
    if (key === 'displayCode') {
      const normalized = String(value ?? '')
        .toUpperCase()
        .slice(0, 3) as CreateProjectDraft[K];
      this.draft.update((draft) => ({ ...draft, [key]: normalized }));
      return;
    }
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateDeliveryDate(value: Date | null): void {
    this.deliveryDateValue.set(value);
    this.updateField('deliveryDate', this.formatDate(value));
  }

  canSubmit(): boolean {
    return !!this.draft().name?.trim() && !!this.draft().projectNo?.trim() && !!this.draft().projectType && !this.avatarUploading() && !this.displayCodeInvalid();
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.create.emit({
      name: draft.name.trim(),
      projectNo: draft.projectNo.trim(),
      projectType: draft.projectType as ProjectType,
      displayCode: draft.displayCode?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      icon: draft.icon?.trim() || undefined,
      avatarUploadId: draft.avatarUploadId?.trim() || undefined,
      contractNo: draft.contractNo?.trim() || undefined,
      deliveryDate: draft.deliveryDate?.trim() || undefined,
      visibility: draft.visibility || 'internal',
    });
  }

  async onAvatarPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }
    const validationMessage = validateUploadFile(file, this.avatarUploadPolicy);
    if (validationMessage) {
      this.message.warning(validationMessage);
      if (input) {
        input.value = '';
      }
      return;
    }

    let normalizedFile: File;
    try {
      normalizedFile = await this.avatarNormalizer.normalize(file);
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '项目图标处理失败');
      if (input) {
        input.value = '';
      }
      return;
    }

    this.avatarUploading.set(true);
    this.projectApi.uploadProjectAvatar(normalizedFile).subscribe({
      next: (upload) => {
        this.avatarUploading.set(false);
        this.draft.update((draft) => ({ ...draft, avatarUploadId: upload.id }));
        this.avatarPreviewUrl.set(URL.createObjectURL(normalizedFile));
      },
      error: () => {
        this.avatarUploading.set(false);
        this.message.error('项目图标上传失败');
      },
    });
    if (input) {
      input.value = '';
    }
  }

  clearAvatar(): void {
    this.draft.update((draft) => ({ ...draft, avatarUploadId: '' }));
    this.avatarPreviewUrl.set(null);
  }

  private formatDate(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) {
      return '';
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
