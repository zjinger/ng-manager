import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import { FormActionsComponent } from '../../../../shared/ui/form-actions/form-actions.component';
import type { AnnouncementEntity, CreateAnnouncementInput } from '../../models/content.model';

type Draft = Omit<CreateAnnouncementInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  summary: '',
  contentMd: '',
  scope: 'project',
  pinned: false,
  expireAt: '',
};

@Component({
  selector: 'app-announcement-create-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="(isEdit() ? '编辑公告' : '新建公告') + (!isEdit() && projectName() ? ' · ' + projectName() : '')"
      [subtitle]="isEdit() ? '修改公告内容后保存。' : '先录入标题、摘要和正文，发布动作后续在列表页继续补。'"
      [icon]="'notification'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="announcement-create-form" class="dialog-form" (ngSubmit)="submitForm()">
          <label class="dialog-field">
            <span class="dialog-field__label">标题</span>
            <input
              nz-input
              maxlength="120"
              placeholder="例如：Hub v2 本周发布计划"
              [ngModel]="draft().title"
              name="title"
              (ngModelChange)="updateField('title', $event)"
            />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">摘要</span>
            <textarea
              nz-input
              rows="3"
              placeholder="给列表卡片使用的简短摘要。"
              [ngModel]="draft().summary"
              name="summary"
              (ngModelChange)="updateField('summary', $event)"
            ></textarea>
          </label>

          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">范围</span>
              <nz-select
                [ngModel]="draft().scope"
                name="scope"
                (ngModelChange)="updateField('scope', $event)"
              >
                <nz-option nzLabel="项目内" nzValue="project"></nz-option>
                <nz-option nzLabel="全局" nzValue="global"></nz-option>
              </nz-select>
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">过期时间</span>
              <input
                nz-input
                type="date"
                [ngModel]="draft().expireAt"
                name="expireAt"
                (ngModelChange)="updateField('expireAt', $event)"
              />
            </label>
          </div>

          <label class="dialog-field">
            <span class="dialog-field__label">正文</span>
            <textarea
              nz-input
              rows="10"
              placeholder="公告正文，当前先用 textarea 代替富文本编辑器。"
              [ngModel]="draft().contentMd"
              name="contentMd"
              (ngModelChange)="updateField('contentMd', $event)"
            ></textarea>
          </label>

          <label class="content-checkbox">
            <input
              nz-checkbox
              type="checkbox"
              [ngModel]="draft().pinned"
              name="pinned"
              (ngModelChange)="updateField('pinned', $event)"
            />
            <span>置顶显示</span>
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
            form="announcement-create-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            {{ isEdit() ? '保存公告' : '创建公告' }}
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
      .content-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
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
export class AnnouncementCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<AnnouncementEntity | null>(null);
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
            title: value.title,
            summary: value.summary ?? '',
            contentMd: value.contentMd,
            scope: value.scope,
            pinned: value.pinned,
            expireAt: value.expireAt ?? '',
          });
        } else {
          this.draft.set({ ...DEFAULT_DRAFT });
        }
      }
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.title.trim().length > 0 && draft.contentMd.trim().length > 0;
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
      summary: draft.summary?.trim() || '',
      contentMd: draft.contentMd.trim(),
      expireAt: draft.expireAt || '',
    });
  }
}
