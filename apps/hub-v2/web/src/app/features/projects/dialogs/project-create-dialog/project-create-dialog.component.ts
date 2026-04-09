import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';

import { UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { DialogShellComponent } from '@shared/ui';
import type { CreateProjectInput } from '../../models/project.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ProjectApiService } from '../../services/project-api.service';

const DEFAULT_DRAFT: CreateProjectInput = {
  name: '',
  displayCode: '',
  description: '',
  icon: '',
  avatarUploadId: '',
  visibility: 'private',
};

@Component({
  selector: 'app-project-create-dialog',
  standalone: true,
  imports: [FormsModule, NzGridModule, NzButtonModule, NzIconModule, NzFormModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="'新建项目'"
      [subtitle]="''"
      [icon]="'folder-add'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'">
          <div class="row" nz-row  [nzGutter]="16"> 
            <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
              <nz-form-label nzRequired nzFor="email">项目名称</nz-form-label>
              <nz-form-control nzErrorTip="请输入项目名称">
                <input nz-input required="true" [ngModel]="draft().name" name="name" (ngModelChange)="updateField('name', $event)" />
              </nz-form-control>
            </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label
                  nzFor="displayCode"
                  nzTooltipTitle="规则：全大写，最多 3 个字符（A-Z/0-9）"
                  [nzTooltipIcon]="'question-circle'"
                >
                  项目标识
                </nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    placeholder="用于展示，默认按项目名生成"
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
           
          </div>
          <div class="row" nz-row  [nzGutter]="16">
            <div class="col" nz-col  [nzSpan]="24" >
            <nz-form-item >
              <nz-form-label  nzFor="email">项目描述</nz-form-label>
              <nz-form-control >
                <textarea nz-input rows="4" placeholder="描述项目的业务边界、协作对象或当前阶段。" [ngModel]="draft().description" name="description" (ngModelChange)="updateField('description', $event)"></textarea>
              </nz-form-control>
            </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row  [nzGutter]="16">
            <!-- <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
                <nz-form-label  nzFor="visibility">图标</nz-form-label>
                <nz-form-control >
                  <input
                    nz-input
                    placeholder="可先填写 emoji 或简写"
                    [ngModel]="draft().icon"
                    name="icon"
                    (ngModelChange)="updateField('icon', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div> -->
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
            <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
                <nz-form-label
                  nzRequired
                  nzTooltipTitle="内部：所有登录用户可查看（仅成员可维护）；私有：仅项目成员可查看和维护"
                  [nzTooltipIcon]="'question-circle'"
                  nzFor="visibility"
                  >可见性</nz-form-label
                >
                <nz-form-control >
                  <nz-select [ngModel]="draft().visibility" name="visibility" (ngModelChange)="updateField('visibility', $event)">
                  <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                  <nz-option nzLabel="私有" nzValue="private"></nz-option>
                </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" (click)="submitForm()" [disabled]="!canSubmit()" type="submit" >
          <nz-icon nzType="check" nzTheme="outline"/>
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
  readonly avatarUploadPolicy = UPLOAD_TARGETS.projectAvatar;

  readonly open = input(false);
  readonly busy = input(false);
  readonly create = output<CreateProjectInput>();
  readonly cancel = output<void>();

  readonly draft = signal<CreateProjectInput>({ ...DEFAULT_DRAFT });
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
        this.avatarUploading.set(false);
        this.avatarPreviewUrl.set(null);
      }
    });
  }

  updateField<K extends keyof CreateProjectInput>(key: K, value: CreateProjectInput[K]): void {
    if (key === 'displayCode') {
      const normalized = String(value ?? '')
        .toUpperCase()
        .slice(0, 3) as CreateProjectInput[K];
      this.draft.update((draft) => ({ ...draft, [key]: normalized }));
      return;
    }
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  canSubmit(): boolean {
    return !!this.draft().name?.trim() && !this.avatarUploading() && !this.displayCodeInvalid();
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.create.emit({
      name: draft.name.trim(),
      displayCode: draft.displayCode?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      icon: draft.icon?.trim() || undefined,
      avatarUploadId: draft.avatarUploadId?.trim() || undefined,
      visibility: draft.visibility || 'internal',
    });
  }

  onAvatarPicked(event: Event): void {
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
