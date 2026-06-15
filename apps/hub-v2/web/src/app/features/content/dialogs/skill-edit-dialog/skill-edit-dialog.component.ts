import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { SKILL_CATEGORY_OPTIONS } from '../../constants/skill-hub-options';
import type { SkillDetailEntity, SkillUpdateInput } from '../../models/skill-hub.model';

@Component({
  selector: 'app-skill-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      title="编辑 Skill 信息"
      [subtitle]="skill()?.name || ''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="skill-edit-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label>分类</nz-form-label>
            <nz-form-control>
              <nz-select
                [ngModel]="category()"
                name="category"
                nzPlaceHolder="选择分类"
                [disabled]="busy()"
                (ngModelChange)="category.set($event)"
              >
                @for (item of categoryOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

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
                [minHeight]="'260px'"
                [maxHeight]="'420px'"
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
          <button nz-button nzType="primary" type="submit" form="skill-edit-form" [nzLoading]="busy()" [disabled]="!canSubmit()">
            <nz-icon nzType="check" nzTheme="outline"></nz-icon>
            保存
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
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
export class SkillEditDialogComponent {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly skill = input<SkillDetailEntity | null>(null);
  readonly save = output<SkillUpdateInput>();
  readonly cancel = output<void>();

  readonly categoryOptions = SKILL_CATEGORY_OPTIONS;
  readonly category = signal('general');
  readonly tags = signal<string[]>([]);
  readonly tagInput = signal('');
  readonly descriptionMd = signal('');
  readonly maxTags = 3;
  readonly maxTagLength = 5;
  readonly canSubmit = computed(() => !!this.skill() && !this.busy());
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'skill-edit-description-editor',
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file, UPLOAD_TARGETS.markdownImage);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const skill = this.skill();
      this.category.set(skill?.category || 'general');
      this.tags.set(skill?.tags.slice(0, this.maxTags) || []);
      this.tagInput.set('');
      this.descriptionMd.set(skill?.descriptionMd || '');
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
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

  submitForm(): void {
    if (!this.skill()) {
      return;
    }
    this.save.emit({
      category: this.category().trim(),
      tags: this.tags(),
      descriptionMd: this.descriptionMd().trim(),
    });
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
}
