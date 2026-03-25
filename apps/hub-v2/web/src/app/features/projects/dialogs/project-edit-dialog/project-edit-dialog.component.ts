import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { ProjectSummary, UpdateProjectInput } from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';

type EditDraft = {
  name: string;
  displayCode: string;
  description: string;
  icon: string;
  avatarUploadId: string;
  visibility: 'internal' | 'private';
};

@Component({
  selector: 'app-project-edit-dialog',
  standalone: true,
  imports: [DatePipe, FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="'编辑项目'"
      [subtitle]="''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <div class="project-edit-overview">
          <span class="project-edit-overview__avatar">
            @if (avatarPreviewUrl()) {
              <img [src]="avatarPreviewUrl()!" alt="project avatar" />
            } @else {
              {{ (draft().displayCode || draft().name || '项目').slice(0, 2).toUpperCase() }}
            }
          </span>
          <div class="project-edit-overview__info">
            <h3>{{ draft().name || project()?.name || '未命名项目' }}</h3>
            <p>
             {{ project()?.displayCode || '-' }}
              · 创建于 {{ project()?.createdAt | date: 'yyyy-MM-dd' }}
              · {{ project()?.status === 'active' ? '活跃项目' : '已归档' }}
            </p>
          </div>
        </div>
        <div class="project-edit-overview__divider"></div>

        <form nz-form [nzLayout]="'vertical'">
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="24">
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
                  nzTooltipTitle="规则：全大写，最多 3 个字符（A-Z/0-9）"
                  [nzTooltipIcon]="'question-circle'"
                >
                  项目标识
                </nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="3"
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
                <nz-form-label>可见性</nz-form-label>
                <nz-form-control>
                  <nz-select
                    [ngModel]="draft().visibility"
                    name="visibility"
                    (ngModelChange)="update('visibility', $event || 'internal')"
                  >
                    <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                    <nz-option nzLabel="私有" nzValue="private"></nz-option>
                  </nz-select>
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
                <nz-form-label>项目图标</nz-form-label>
                <nz-form-control>
                  <div class="project-avatar-field">
                    <span class="project-avatar-preview">
                      @if (avatarPreviewUrl()) {
                        <img [src]="avatarPreviewUrl()!" alt="project avatar" />
                      } @else {
                        {{ (draft().displayCode || draft().name || '项目').slice(0, 2).toUpperCase() }}
                      }
                    </span>
                    <input #avatarInput type="file" accept="image/*" hidden (change)="onAvatarPicked($event)" />
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
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" (click)="submit()">
          <nz-icon nzType="save" nzTheme="outline" />
          保存
        </button>
      </ng-container>
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
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        overflow: hidden;
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

  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly cancel = output<void>();
  readonly save = output<UpdateProjectInput>();

  readonly draft = signal<EditDraft>({
    name: '',
    displayCode: '',
    description: '',
    icon: '',
    avatarUploadId: '',
    visibility: 'internal'
  });
  readonly avatarUploading = signal(false);
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly displayCodeInvalid = computed(() => {
    const value = this.draft().displayCode.trim();
    return value.length > 0 && !/^[A-Z0-9]{1,3}$/.test(value);
  });
  readonly canSubmit = computed(() => !!this.draft().name.trim() && !this.displayCodeInvalid());

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
        displayCode: project.displayCode ?? '',
        description: project.description ?? '',
        icon: project.icon ?? '',
        avatarUploadId: project.avatarUploadId ?? '',
        visibility: project.visibility === 'private' ? 'private' : 'internal'
      });
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

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.save.emit({
      name: draft.name.trim(),
      displayCode: draft.displayCode.trim() || null,
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      avatarUploadId: draft.avatarUploadId.trim() || null,
      visibility: draft.visibility
    });
  }

  onAvatarPicked(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.message.warning('仅支持图片文件');
      if (input) {
        input.value = '';
      }
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.message.warning('图片大小不能超过 10MB');
      if (input) {
        input.value = '';
      }
      return;
    }

    this.avatarUploading.set(true);
    this.projectApi.uploadProjectAvatar(file).subscribe({
      next: (upload) => {
        this.avatarUploading.set(false);
        this.draft.update((draft) => ({ ...draft, avatarUploadId: upload.id }));
        this.avatarPreviewUrl.set(URL.createObjectURL(file));
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
}
