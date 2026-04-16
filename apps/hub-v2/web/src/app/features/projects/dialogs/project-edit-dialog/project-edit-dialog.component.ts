import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { AvatarImageNormalizerService } from '@shared/services/avatar-image-normalizer.service';
import { DialogShellComponent } from '@shared/ui';
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_OPTIONS, type ProjectSummary, type ProjectType, type UpdateProjectInput } from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

type EditDraft = {
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

@Component({
  selector: 'app-project-edit-dialog',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, NzDatePickerModule, DialogShellComponent, NzPopconfirmModule],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="820"
      [title]="'编辑项目'"
      [subtitle]="''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <div class="project-edit-overview">
          <span class="project-edit-overview__avatar" [ngClass]="{'without-avatar': !avatarPreviewUrl()}">
            @if (avatarPreviewUrl()) {
              <img [src]="avatarPreviewUrl()!" alt="project avatar" />
            } @else {
              {{ (draft().displayCode || draft().name || '项目').slice(0, 3).toUpperCase() }}
            }
          </span>
          <div class="project-edit-overview__info">
            <h3>{{ draft().name || project()?.name || '未命名项目' }}</h3>
            <p>
              {{ project()?.projectNo || '-' }}
              · {{ project() ? projectTypeLabel(project()!.projectType) : '-' }}
              · 创建于 {{ project()?.createdAt | date: 'yyyy-MM-dd' }}
              · {{ project()?.status === 'active' ? '活跃项目' : '已归档' }}
            </p>
          </div>
        </div>
        <div class="project-edit-overview__divider"></div>

        <form nz-form [nzLayout]="'vertical'">
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>项目名称</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draft().name" name="name" (ngModelChange)="update('name', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
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
                    maxlength="64"
                    [ngModel]="draft().projectNo"
                    name="projectNo"
                    (ngModelChange)="update('projectNo', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>项目类型</nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draft().projectType" name="projectType" (ngModelChange)="update('projectType', $event || '')">
                    @for (item of projectTypeOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzTooltipTitle="即项目缩写，应用在工单编号上，规则：全大写，最多 3 个字符（A-Z/0-9）" [nzTooltipIcon]="'question-circle'">
                  项目标识
                </nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="3"
                    placeholder="可选，默认按项目名生成"
                    [ngModel]="draft().displayCode"
                    name="displayCode"
                    (ngModelChange)="update('displayCode', $event)"
                  />
                  @if (displayCodeInvalid()) {
                    <span class="project-display-code-error">项目标识需为全大写，且最多 3 位（A-Z/0-9）</span>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzTooltipTitle="内部：所有登录用户可查看（仅成员可维护）；私有：仅项目成员可查看和维护" [nzTooltipIcon]="'question-circle'">
                  可见性
                </nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draft().visibility" name="visibility" (ngModelChange)="update('visibility', $event || 'internal')">
                    <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                    <nz-option nzLabel="私有" nzValue="private"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>合同编号</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draft().contractNo" name="contractNo" (ngModelChange)="update('contractNo', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
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
            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label>项目描述</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="4"
                    [ngModel]="draft().description"
                    name="description"
                    (ngModelChange)="update('description', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzTooltipTitle="上传项目图标，尺寸建议为48x48、64x64像素" nzTooltipIcon="question-circle">项目图标</nz-form-label>
                <nz-form-control>
                  <div class="project-avatar-field">
                    <span class="project-avatar-preview" [ngClass]="{'without-avatar': !avatarPreviewUrl()}">
                      @if (avatarPreviewUrl()) {
                        <img [src]="avatarPreviewUrl()!" alt="project avatar" />
                      } @else {
                        {{ (draft().displayCode || draft().name || '项目').slice(0, 3).toUpperCase() }}
                      }
                    </span>
                    @if(canEditProjects()) {
                      <input #avatarInput type="file" [accept]="avatarUploadPolicy.accept" hidden (change)="onAvatarPicked($event)" />
                      <button nz-button type="button" [nzLoading]="avatarUploading()" (click)="avatarInput.click()">上传图标</button>
                      @if (draft().avatarUploadId) {
                        <button nz-popconfirm nzPopconfirmTitle="确定要移除项目图标吗？" nzPopconfirmPlacement="top" (nzOnConfirm)="clearAvatar()" nz-button nzType="default" type="button">移除</button>
                      }
                    }
                  </div>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>
      @if(canEditProjects()){
        <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" (click)="submit()">
          <nz-icon nzType="save" nzTheme="outline" />
          保存
        </button>
      </ng-container>
      }
      
    </app-dialog-shell>
  `,
  styles: [
    `
      .project-edit-overview {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .project-edit-overview__avatar {
        width: 68px;
        height: 68px;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        overflow: hidden;
        &.without-avatar{
          background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        }
      }
      .project-edit-overview__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .project-edit-overview__info h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 22px;
        font-weight: 700;
      }
      .project-edit-overview__info p {
        margin: 6px 0 0;
        color: var(--text-muted);
        font-size: 14px;
      }
      .project-edit-overview__divider {
        height: 1px;
        background: var(--border-color-soft);
        margin-bottom: 16px;
      }
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
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
        &.without-avatar{
          background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        }
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
      @media (max-width: 768px) {
        .project-edit-overview {
          align-items: flex-start;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectEditDialogComponent {
  private readonly projectApi = inject(ProjectApiService);
  private readonly message = inject(NzMessageService);
  private readonly avatarNormalizer = inject(AvatarImageNormalizerService);
  readonly avatarUploadPolicy = UPLOAD_TARGETS.projectAvatar;

  readonly open = input(false);
  readonly busy = input(false);
  readonly canEditProjects = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly cancel = output<void>();
  readonly save = output<UpdateProjectInput>();
  readonly projectTypeOptions = PROJECT_TYPE_OPTIONS;

  readonly draft = signal<EditDraft>({
    name: '',
    projectNo: '',
    projectType: '',
    displayCode: '',
    description: '',
    icon: '',
    avatarUploadId: '',
    contractNo: '',
    deliveryDate: '',
    visibility: 'internal'
  });
  readonly deliveryDateValue = signal<Date | null>(null);
  readonly avatarUploading = signal(false);
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly displayCodeInvalid = computed(() => {
    const value = this.draft().displayCode.trim();
    return value.length > 0 && !/^[A-Z0-9]{1,3}$/.test(value);
  });
  readonly canSubmit = computed(
    () => !!this.draft().name.trim() && !!this.draft().projectNo.trim() && !!this.draft().projectType && !this.displayCodeInvalid() && !this.avatarUploading()
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const project = this.project();
      if (!project) {
        return;
      }
      this.draft.set({
        name: project.name,
        projectNo: project.projectNo,
        projectType: project.projectType,
        displayCode: project.displayCode ?? '',
        description: project.description ?? '',
        icon: project.icon ?? '',
        avatarUploadId: project.avatarUploadId ?? '',
        contractNo: project.contractNo ?? '',
        deliveryDate: project.deliveryDate ?? '',
        visibility: project.visibility === 'private' ? 'private' : 'internal'
      });
      this.deliveryDateValue.set(this.parseDate(project.deliveryDate));
      this.avatarPreviewUrl.set(project.avatarUrl ?? null);
      this.avatarUploading.set(false);
    });
  }

  update<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    if (key === 'displayCode') {
      const normalized = String(value ?? '')
        .toUpperCase()
        .slice(0, 3) as EditDraft[K];
      this.draft.update((draft) => ({ ...draft, [key]: normalized }));
      return;
    }
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateDeliveryDate(value: Date | null): void {
    this.deliveryDateValue.set(value);
    this.update('deliveryDate', this.formatDate(value));
  }

  projectTypeLabel(value: ProjectType): string {
    return PROJECT_TYPE_LABELS[value] ?? value;
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.save.emit({
      name: draft.name.trim(),
      projectNo: draft.projectNo.trim(),
      projectType: draft.projectType as ProjectType,
      displayCode: draft.displayCode.trim() || null,
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      avatarUploadId: draft.avatarUploadId.trim() || null,
      contractNo: draft.contractNo.trim() || null,
      deliveryDate: draft.deliveryDate.trim() || null,
      visibility: draft.visibility
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

  private parseDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
