import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { FormActionsComponent, DialogShellComponent } from '@shared/ui';
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
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
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
      [subtitle]="''"
      [icon]="'notification'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="announcement-create-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired>标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="例如：Hub v2 本周发布计划"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
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
                    placeholder="给列表卡片使用的简短摘要。"
                    [ngModel]="draft().summary"
                    name="summary"
                    (ngModelChange)="updateField('summary', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>范围</nz-form-label>
                <nz-form-control>
                  <nz-select
                    [ngModel]="draft().scope"
                    name="scope"
                    (ngModelChange)="updateField('scope', $event)"
                  >
                    <nz-option nzLabel="项目内" nzValue="project"></nz-option>
                    <nz-option nzLabel="全局" nzValue="global"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>过期时间</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="选择过期时间"
                    [ngModel]="expireAtDate()"
                    name="expireAtDate"
                    (ngModelChange)="onExpireAtDateChange($event)"
                  ></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label>正文</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="10"
                    placeholder="公告正文，当前先用 textarea 代替富文本编辑器。"
                    [ngModel]="draft().contentMd"
                    name="contentMd"
                    (ngModelChange)="updateField('contentMd', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <label nz-checkbox [ngModel]="draft().pinned" name="pinned" (ngModelChange)="updateField('pinned', $event)">
                置顶显示
              </label>
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
      :host ::ng-deep .ant-picker {
        width: 100%;
      }
      :host ::ng-deep .ant-checkbox-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
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
  readonly expireAtDate = computed<Date | null>(() => {
    const value = this.draft().expireAt?.trim();
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

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

  onExpireAtDateChange(value: Date | null): void {
    if (!value) {
      this.updateField('expireAt', '' as Draft['expireAt']);
      return;
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    this.updateField('expireAt', `${year}-${month}-${day}` as Draft['expireAt']);
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
