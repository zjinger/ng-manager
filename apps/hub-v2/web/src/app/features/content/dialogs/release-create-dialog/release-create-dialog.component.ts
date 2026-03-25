import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import { FormActionsComponent } from '../../../../shared/ui/form-actions/form-actions.component';
import type { CreateReleaseInput, ReleaseEntity } from '../../models/content.model';

type Draft = Omit<CreateReleaseInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  channel: 'stable',
  version: '',
  title: '',
  notes: '',
  downloadUrl: '',
};

@Component({
  selector: 'app-release-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="(isEdit() ? '编辑发布' : '新建发布') + (!isEdit() && projectName() ? ' · ' + projectName() : '')"
      [subtitle]="isEdit() ? '修改发布信息后保存。' : '录入版本号、渠道和更新说明，后续再补完整发布流。'"
      [icon]="'cloud-upload'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="release-create-form" class="dialog-form" (ngSubmit)="submitForm()">
          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">标题</span>
              <input
                nz-input
                maxlength="120"
                placeholder="例如：Hub v2 Beta 发布"
                [ngModel]="draft().title"
                name="title"
                (ngModelChange)="updateField('title', $event)"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">版本号</span>
              <input
                nz-input
                maxlength="40"
                placeholder="例如：v2.0.0-beta.1"
                [ngModel]="draft().version"
                name="version"
                (ngModelChange)="updateField('version', $event)"
              />
            </label>
          </div>

          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">渠道</span>
              <input
                nz-input
                maxlength="40"
                placeholder="例如：stable / beta / canary"
                [ngModel]="draft().channel"
                name="channel"
                (ngModelChange)="updateField('channel', $event)"
              />
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">下载地址</span>
              <input
                nz-input
                maxlength="200"
                placeholder="可选：安装包地址"
                [ngModel]="draft().downloadUrl"
                name="downloadUrl"
                (ngModelChange)="updateField('downloadUrl', $event)"
              />
            </label>
          </div>

          <label class="dialog-field">
            <span class="dialog-field__label">更新说明</span>
            <textarea
              nz-input
              rows="10"
              placeholder="补充本次版本更新内容。"
              [ngModel]="draft().notes"
              name="notes"
              (ngModelChange)="updateField('notes', $event)"
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
            form="release-create-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            {{ isEdit() ? '保存发布' : '创建发布' }}
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
export class ReleaseCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<ReleaseEntity | null>(null);
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
            channel: value.channel,
            version: value.version,
            title: value.title,
            notes: value.notes ?? '',
            downloadUrl: value.downloadUrl ?? '',
          });
        } else {
          this.draft.set({ ...DEFAULT_DRAFT });
        }
      }
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.title.trim().length > 0 && draft.version.trim().length > 0;
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
      version: draft.version.trim(),
      channel: draft.channel.trim() || 'stable',
      notes: draft.notes?.trim() || '',
      downloadUrl: draft.downloadUrl?.trim() || '',
    });
  }
}
