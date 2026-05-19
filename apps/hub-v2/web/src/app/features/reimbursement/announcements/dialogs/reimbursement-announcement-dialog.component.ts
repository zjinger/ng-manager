import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { AnnouncementEntity, CreateAnnouncementInput } from '../../../content/models/content.model';

type Draft = Pick<CreateAnnouncementInput, 'title' | 'summary' | 'contentMd' | 'pinned' | 'effectiveAt' | 'notifyRelatedUsers' | 'expireAt'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  summary: '',
  contentMd: '',
  pinned: false,
  effectiveAt: '',
  notifyRelatedUsers: false,
  expireAt: '',
};

@Component({
  selector: 'app-reimbursement-announcement-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="isEdit() ? '编辑报销公告' : '新建报销公告'"
      [subtitle]="'全局公告'"
      [icon]="'notification'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="reimbursement-announcement-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired>标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="例如：报销提交流程调整通知"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>生效日期</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    class="reimbursement-announcement-dialog__date-picker"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="选择生效日期"
                    [ngModel]="effectiveAtDate()"
                    name="effectiveAtDate"
                    (ngModelChange)="onDateChange('effectiveAt', $event)"
                  ></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>过期时间</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    class="reimbursement-announcement-dialog__date-picker"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="选择过期时间"
                    [ngModel]="expireAtDate()"
                    name="expireAtDate"
                    (ngModelChange)="onDateChange('expireAt', $event)"
                  ></nz-date-picker>
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
                    placeholder="给工作台公告卡片使用的简短摘要。"
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
                  <textarea
                    nz-input
                    rows="10"
                    placeholder="请输入报销公告正文。"
                    [ngModel]="draft().contentMd"
                    name="contentMd"
                    (ngModelChange)="updateField('contentMd', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <label
                nz-checkbox
                [ngModel]="draft().pinned"
                name="pinned"
                (ngModelChange)="updateField('pinned', $event)"
              >
                置顶显示
              </label>
            </div>
            <div nz-col nzSpan="12">
              <label
                nz-checkbox
                [ngModel]="draft().notifyRelatedUsers"
                name="notifyRelatedUsers"
                (ngModelChange)="updateField('notifyRelatedUsers', $event)"
              >
                通知相关人员
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
            form="reimbursement-announcement-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            <nz-icon nzType="check" nzTheme="outline"></nz-icon>
            {{ isEdit() ? '保存公告' : '创建公告' }}
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .reimbursement-announcement-dialog__date-picker {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementAnnouncementDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<AnnouncementEntity | null>(null);
  readonly submit = output<Draft>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly isEdit = computed(() => !!this.value());
  readonly effectiveAtDate = computed(() => this.parseDate(this.draft().effectiveAt ?? ''));
  readonly expireAtDate = computed(() => this.parseDate(this.draft().expireAt ?? ''));

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const value = this.value();
      if (value) {
        this.draft.set({
          title: value.title,
          summary: value.summary ?? '',
          contentMd: value.contentMd,
          pinned: value.pinned,
          effectiveAt: value.effectiveAt ?? '',
          notifyRelatedUsers: value.notifyRelatedUsers,
          expireAt: value.expireAt ?? '',
        });
        return;
      }
      this.draft.set({ ...DEFAULT_DRAFT });
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.title.trim().length > 0 && draft.contentMd.trim().length > 0;
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  onDateChange(key: 'effectiveAt' | 'expireAt', value: Date | null): void {
    if (!value) {
      this.updateField(key, '' as Draft[typeof key]);
      return;
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    this.updateField(key, `${year}-${month}-${day}` as Draft[typeof key]);
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.submit.emit({
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary?.trim() || '',
      contentMd: draft.contentMd.trim(),
      effectiveAt: draft.effectiveAt || '',
      expireAt: draft.expireAt || '',
    });
  }

  private parseDate(value: string): Date | null {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
