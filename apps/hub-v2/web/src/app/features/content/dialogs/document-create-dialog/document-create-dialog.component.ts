import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { ImageUploadService } from '@shared/services/image-upload.service';
import type { CreateDocumentInput, DocumentEntity } from '../../models/content.model';

type Draft = Omit<CreateDocumentInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  slug: '',
  title: '',
  category: '',
  summary: '',
  contentMd: '',
  version: '',
};

@Component({
  selector: 'app-document-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, DialogShellComponent, FormActionsComponent, MarkdownEditorComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="'60%'"
      [center]="true"
      [title]="(isEdit() ? '编辑文档' : '新建文档') + (!isEdit() && projectName() ? ' · ' + projectName() : '')"
      [subtitle]="''"
      [icon]="'file-text'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="document-create-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="例如：Hub v2 接口约定"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label
                  nzRequired
                  nzTooltipTitle="用于生成文档链接，建议使用英文短词并用中划线连接"
                  [nzTooltipIcon]="'question-circle'"
                >
                  文档标识（Slug）
                </nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="80"
                    placeholder="例如：hub-v2-api-design"
                    [ngModel]="draft().slug"
                    name="slug"
                    (ngModelChange)="updateField('slug', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>分类</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="40"
                    placeholder="例如：架构设计"
                    [ngModel]="draft().category"
                    name="category"
                    (ngModelChange)="updateField('category', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>版本</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="40"
                    placeholder="例如：v1.0"
                    [ngModel]="draft().version"
                    name="version"
                    (ngModelChange)="updateField('version', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label>摘要</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="3"
                    placeholder="简要描述文档内容。"
                    [ngModel]="draft().summary"
                    name="summary"
                    (ngModelChange)="updateField('summary', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired>正文</nz-form-label>
                <nz-form-control>
                  <app-markdown-editor
                    [ngModel]="draft().contentMd"
                    [config]="editorConfig"
                    [imageUploadHandler]="uploadMarkdownImage"
                    name="contentMd"
                    [minHeight]="'300px'"
                    [maxHeight]="'420px'"
                    (contentChange)="updateField('contentMd', $event)"
                    (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                    [placeholder]="'请输入文档正文，支持 Markdown 语法'"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button
            nz-button
            nzType="primary"
            type="submit"
            form="document-create-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            {{ isEdit() ? '保存文档' : '创建文档' }}
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentCreateDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<DocumentEntity | null>(null);
  readonly projectName = input<string>('');
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly isEdit = computed(() => !!this.value());
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'document-editor',
    status: ['lines', 'words'],
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => this.imageUpload.uploadImage(file);

  constructor() {
    effect(() => {
      if (this.open()) {
        const value = this.value();
        if (value) {
          this.draft.set({
            slug: value.slug,
            title: value.title,
            category: value.category ?? '',
            summary: value.summary ?? '',
            contentMd: value.contentMd,
            version: value.version ?? '',
          });
        } else {
          this.draft.set({ ...DEFAULT_DRAFT });
        }
      }
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.title.trim().length > 0 && draft.slug.trim().length > 0 && draft.contentMd.trim().length > 0;
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.create.emit({
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      category: draft.category?.trim() || '',
      summary: draft.summary?.trim() || '',
      contentMd: draft.contentMd.trim(),
      version: draft.version?.trim() || '',
    });
  }
}
