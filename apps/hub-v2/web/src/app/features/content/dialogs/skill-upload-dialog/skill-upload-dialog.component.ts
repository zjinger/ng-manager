import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent, FileUploadDropzoneComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { SKILL_CATEGORY_OPTIONS } from '../../constants/skill-hub-options';
import type { SkillDetailEntity, SkillUploadInput } from '../../models/skill-hub.model';

@Component({
  selector: 'app-skill-upload-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FileUploadDropzoneComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="target() ? '上传新版本' : '上传 Skill'"
      [subtitle]="target() ? target()?.name || '' : '上传包含 SKILL.md 的 zip 包'"
      [icon]="'upload'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="skill-upload-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label nzRequired>Zip 包</nz-form-label>
            <nz-form-control>
              @if (selectedFile(); as file) {
                <div class="selected-package">
                  <div>
                    <strong>{{ file.name }}</strong>
                    <span>{{ formatSize(file.size) }}</span>
                  </div>
                  <button nz-button type="button" [disabled]="busy()" (click)="clearPackage()">
                    <nz-icon nzType="swap" nzTheme="outline"></nz-icon>
                    重新选择
                  </button>
                </div>
              } @else {
                <app-file-upload-dropzone
                  [policy]="uploadPolicy"
                  [files]="files()"
                  [multiple]="false"
                  [disabled]="busy()"
                  title="点击或拖拽 Skill zip 包到此区域"
                  hint="zip 包根目录需要包含 SKILL.md，最大 10MB"
                  (filesChange)="onFilesChange($event)"
                />
              }
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Skill 名称</nz-form-label>
            <nz-form-control nzErrorTip="请输入 Skill 名称">
              <input
                nz-input
                [ngModel]="name()"
                name="name"
                [disabled]="!!target() || busy()"
                placeholder="默认使用 zip 包名称"
                (ngModelChange)="name.set($event)"
              />
            </nz-form-control>
          </nz-form-item>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>版本</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    [ngModel]="version()"
                    name="version"
                    placeholder="0.1.0"
                    (ngModelChange)="version.set($event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>分类</nz-form-label>
                <nz-form-control>
                  <nz-select
                    [ngModel]="category()"
                    name="category"
                    nzPlaceHolder="选择分类"
                    (ngModelChange)="category.set($event)"
                  >
                    @for (item of categoryOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <nz-form-item>
            <nz-form-label>标签</nz-form-label>
            <nz-form-control>
              <div class="tag-input-wrap" (click)="tagInputRef.focus()">
                @for (tag of tags(); track tag) {
                  <span class="tag-input-tag">
                    {{ tag }}
                    <button type="button" [disabled]="busy()" (click)="removeTag(tag); $event.stopPropagation()">×</button>
                  </span>
                }
                <input
                  #tagInputRef
                  class="tag-input-field"
                  [ngModel]="tagInput()"
                  name="tagInput"
                  [maxlength]="maxTagLength"
                  [disabled]="busy() || tags().length >= maxTags"
                  [placeholder]="tags().length ? '' : '输入标签后按 Enter 添加'"
                  (ngModelChange)="onTagInputChange($event)"
                  (keydown)="handleTagKeydown($event)"
                />
              </div>
              <div class="form-hint">最多添加 3 个标签，每个标签不超过 5 个字。</div>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>描述</nz-form-label>
            <nz-form-control>
              <app-markdown-editor
                [ngModel]="descriptionMd()"
                [config]="editorConfig"
                [imageUploadHandler]="uploadMarkdownImage"
                name="descriptionMd"
                [minHeight]="'220px'"
                [maxHeight]="'360px'"
                (contentChange)="descriptionMd.set($event)"
                (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                [placeholder]="'补充安装步骤、使用示例、截图或注意事项，支持 Markdown 语法。'"
              />
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" type="submit" form="skill-upload-form" [nzLoading]="busy()" [disabled]="!canSubmit()">
            <nz-icon nzType="check" nzTheme="outline"></nz-icon>
            上传
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .selected-package {
        min-height: 76px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-subtle);
      }
      .selected-package > div {
        min-width: 0;
        display: grid;
        gap: 4px;
      }
      .selected-package strong {
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .selected-package span {
        color: var(--text-secondary);
        font-size: 12px;
      }
      .tag-input-wrap {
        min-height: 38px;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding: 4px 8px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--surface);
        cursor: text;
      }
      .tag-input-wrap:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
      }
      .tag-input-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--surface-subtle);
        color: var(--text-primary);
        font-size: 12px;
        line-height: 22px;
      }
      .tag-input-tag button {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
      }
      .tag-input-field {
        flex: 1;
        min-width: 140px;
        height: 28px;
        border: none;
        outline: none;
        background: transparent;
      }
      .form-hint {
        margin-top: 6px;
        color: var(--text-secondary);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillUploadDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly target = input<SkillDetailEntity | null>(null);
  readonly create = output<SkillUploadInput>();
  readonly cancel = output<void>();

  readonly uploadPolicy = UPLOAD_TARGETS.skillPackage;
  readonly categoryOptions = SKILL_CATEGORY_OPTIONS;
  readonly files = signal<File[]>([]);
  readonly selectedFile = computed(() => this.files()[0] ?? null);
  readonly name = signal('');
  readonly version = signal('');
  readonly category = signal('general');
  readonly tags = signal<string[]>([]);
  readonly tagInput = signal('');
  readonly descriptionMd = signal('');
  readonly maxTags = 3;
  readonly maxTagLength = 5;
  readonly canSubmit = computed(() => this.files().length > 0 && !!this.name().trim() && !this.busy());
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'skill-upload-description-editor',
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file, UPLOAD_TARGETS.markdownImage);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const target = this.target();
      this.files.set([]);
      this.name.set(target?.name || '');
      this.version.set(target ? '' : '0.1.0');
      this.category.set(target?.category || 'general');
      this.tags.set(target?.tags.slice(0, this.maxTags) || []);
      this.tagInput.set('');
      this.descriptionMd.set(target?.descriptionMd || '');
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  clearPackage(): void {
    this.files.set([]);
    if (!this.target()) {
      this.name.set('');
    }
  }

  onFilesChange(files: File[]): void {
    this.files.set(files);
    const file = files[0];
    if (!file || this.target()) {
      return;
    }
    this.name.set(this.skillNameFromFile(file.name));
  }

  handleTagKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.addTag(this.tagInput());
  }

  onTagInputChange(value: string): void {
    const next = value.length > this.maxTagLength ? value.slice(0, this.maxTagLength) : value;
    this.tagInput.set(next);
  }

  removeTag(tag: string): void {
    this.tags.update((items) => items.filter((item) => item !== tag));
  }

  private addTag(value: string): void {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    if (normalized.length > this.maxTagLength) {
      this.message.warning(`每个标签不超过 ${this.maxTagLength} 个字`);
      this.tagInput.set(normalized.slice(0, this.maxTagLength));
      return;
    }
    if (this.tags().length >= this.maxTags) {
      this.message.warning(`最多添加 ${this.maxTags} 个标签`);
      return;
    }
    if (!this.tags().includes(normalized)) {
      this.tags.update((items) => [...items, normalized]);
    }
    this.tagInput.set('');
  }

  submitForm(): void {
    const file = this.files()[0];
    const name = this.name().trim();
    if (!file || !name) {
      return;
    }

    this.create.emit({
      file,
      name,
      version: this.version().trim(),
      category: this.category().trim(),
      tags: this.tags().join(','),
      descriptionMd: this.descriptionMd().trim(),
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private skillNameFromFile(fileName: string): string {
    return fileName.replace(/\.zip$/i, '').trim();
  }
}
