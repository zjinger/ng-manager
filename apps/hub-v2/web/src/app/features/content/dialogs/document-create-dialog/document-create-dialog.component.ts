import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import { FormActionsComponent } from '@shared/ui';
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
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="900"
      [title]="(isEdit() ? '编辑文档' : '新建文档') + (!isEdit() && projectName() ? ' · ' + projectName() : '')"
      [subtitle]="isEdit() ? '修改文档内容后保存。' : '先录入标题、标识和正文，版本和分类可以后续再维护。'"
      [icon]="'file-text'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="document-create-form" class="dialog-form" (ngSubmit)="submitForm()">
          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">标题</span>
              <input
                nz-input
                maxlength="120"
                placeholder="例如：Hub v2 接口约定"
                [ngModel]="draft().title"
                name="title"
                (ngModelChange)="updateField('title', $event)"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">Slug</span>
              <input
                nz-input
                maxlength="80"
                placeholder="例如：hub-v2-api-design"
                [ngModel]="draft().slug"
                name="slug"
                (ngModelChange)="updateField('slug', $event)"
              />
            </label>
          </div>

          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">分类</span>
              <input
                nz-input
                maxlength="40"
                placeholder="例如：架构设计"
                [ngModel]="draft().category"
                name="category"
                (ngModelChange)="updateField('category', $event)"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">版本</span>
              <input
                nz-input
                maxlength="40"
                placeholder="例如：v1.0"
                [ngModel]="draft().version"
                name="version"
                (ngModelChange)="updateField('version', $event)"
              />
            </label>
          </div>

          <label class="dialog-field">
            <span class="dialog-field__label">摘要</span>
            <textarea
              nz-input
              rows="3"
              placeholder="简要描述文档内容。"
              [ngModel]="draft().summary"
              name="summary"
              (ngModelChange)="updateField('summary', $event)"
            ></textarea>
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">正文</span>
            <textarea
              nz-input
              rows="12"
              placeholder="当前先用 textarea 代替 Markdown 编辑器。"
              [ngModel]="draft().contentMd"
              name="contentMd"
              (ngModelChange)="updateField('contentMd', $event)"
            ></textarea>
          </label>
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
  styles: [
    `
      .dialog-form__grid--wide {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (max-width: 768px) {
        .dialog-form__grid--wide {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<DocumentEntity | null>(null);
  readonly projectName = input<string>('');
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly isEdit = computed(() => !!this.value());

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
