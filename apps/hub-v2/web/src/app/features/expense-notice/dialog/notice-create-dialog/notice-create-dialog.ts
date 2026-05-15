import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import { NoticeFormValue } from '../../models/notice.model';

// ==================== 类型 ====================

/**
 * 下拉选项
 */
export interface SelectOption {
  label: string;
  value: string;
}

// ==================== 默认值 ====================

const DEFAULT_FORM: NoticeFormValue = {
  title: '',

  type: '',

  visibleScope: '',

  publishStatus: 'draft',

  effectiveDate: '',

  expireDate: '',

  content: '',

  pinned: false,

  notifyRelatedUsers: true,
};

@Component({
  selector: 'app-notice-create-dialog',

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
    NzSelectModule,
    NzSwitchModule,
    DialogShellComponent,
    FormActionsComponent,
  ],

  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="920"
      [title]="isEdit() ? '编辑公告' : '新增公告'"
      [icon]="'notification'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="notice-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <!-- 标题 -->
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired>公告标题</nz-form-label>

                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="请输入公告标题"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 类型 + 范围 -->
          <div nz-row nzGutter="16">
            <!-- 公告类型 -->
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>公告类型</nz-form-label>

                <nz-form-control>
                  <nz-select
                    nzPlaceHolder="请选择公告类型"
                    [ngModel]="draft().type"
                    name="type"
                    (ngModelChange)="updateField('type', $event)"
                  >
                    @for (item of noticeTypeOptions(); track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <!-- 可见范围 -->
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>可见范围</nz-form-label>

                <nz-form-control>
                  <nz-select
                    nzPlaceHolder="请选择可见范围"
                    [ngModel]="draft().visibleScope"
                    name="visibleScope"
                    (ngModelChange)="updateField('visibleScope', $event)"
                  >
                    @for (item of visibleScopeOptions(); track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 状态 + 生效时间 -->
          <div nz-row nzGutter="16">
            <!-- 发布状态 -->
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>发布状态</nz-form-label>

                <nz-form-control>
                  <nz-select
                    nzPlaceHolder="请选择发布状态"
                    [ngModel]="draft().publishStatus"
                    name="publishStatus"
                    (ngModelChange)="updateField('publishStatus', $event)"
                  >
                    @for (item of publishStatusOptions(); track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <!-- 生效日期 -->
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>生效日期</nz-form-label>

                <nz-form-control>
                  <nz-date-picker
                    class="notice-dialog__date-picker"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="请选择生效日期"
                    [ngModel]="effectiveDateValue()"
                    name="effectiveDate"
                    (ngModelChange)="onEffectiveDateChange($event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 失效时间 -->
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>失效日期</nz-form-label>

                <nz-form-control>
                  <nz-date-picker
                    class="notice-dialog__date-picker"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="请选择失效日期"
                    [ngModel]="expireDateValue()"
                    name="expireDate"
                    (ngModelChange)="onExpireDateChange($event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 公告内容 -->
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired>公告内容</nz-form-label>

                <nz-form-control>
                  <textarea
                    nz-input
                    rows="10"
                    maxlength="5000"
                    placeholder="请输入公告内容"
                    [ngModel]="draft().content"
                    name="content"
                    (ngModelChange)="updateField('content', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 开关 -->
          <div nz-row nzGutter="16">
            <!-- 是否置顶 -->
            <div nz-col nzSpan="12">
              <div class="notice-dialog__switch-item">
                <div>
                  <div class="notice-dialog__switch-title">是否置顶</div>

                  <div class="notice-dialog__switch-desc">开启后公告将在列表顶部优先展示</div>
                </div>

                <nz-switch
                  [ngModel]="draft().pinned"
                  name="pinned"
                  (ngModelChange)="updateField('pinned', $event)"
                />
              </div>
            </div>

            <!-- 是否通知 -->
            <div nz-col nzSpan="12">
              <div class="notice-dialog__switch-item">
                <div>
                  <div class="notice-dialog__switch-title">是否通知相关人员</div>

                  <div class="notice-dialog__switch-desc">开启后将向相关人员发送通知消息</div>
                </div>

                <nz-switch
                  [ngModel]="draft().notifyRelatedUsers"
                  name="notifyRelatedUsers"
                  (ngModelChange)="updateField('notifyRelatedUsers', $event)"
                />
              </div>
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
            form="notice-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            <nz-icon nzType="check" nzTheme="outline" />

            {{ isEdit() ? '保存公告' : '创建公告' }}
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,

  styles: [
    `
      .notice-dialog__date-picker {
        width: 100%;
      }

      .notice-dialog__switch-item {
        height: 100%;

        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 16px;

        padding: 16px;

        border-radius: 12px;

        border: 1px solid var(--border-color-soft);

        background: var(--bg-container);
      }

      .notice-dialog__switch-title {
        color: var(--text-primary);

        font-size: 14px;

        font-weight: 600;
      }

      .notice-dialog__switch-desc {
        margin-top: 4px;

        color: var(--text-muted);

        font-size: 12px;

        line-height: 1.5;
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeCreateDialogComponent {
  // ==================== 输入 ====================

  readonly open = input(false);

  readonly busy = input(false);

  /**
   * 编辑数据
   */
  readonly value = input<NoticeFormValue | null>(null);

  /**
   * 公告类型
   */
  readonly noticeTypeOptions = input<SelectOption[]>([]);

  /**
   * 可见范围
   */
  readonly visibleScopeOptions = input<SelectOption[]>([]);

  /**
   * 发布状态
   */
  readonly publishStatusOptions = input<SelectOption[]>([]);

  // ==================== 输出 ====================

  readonly submit = output<NoticeFormValue>();

  readonly cancel = output<void>();

  // ==================== 状态 ====================

  readonly draft = signal<NoticeFormValue>({
    ...DEFAULT_FORM,
  });

  /**
   * 是否编辑模式
   */
  readonly isEdit = computed(() => !!this.value());

  /**
   * 是否允许提交
   */
  readonly canSubmit = computed(() => {
    const draft = this.draft();

    return (
      draft.title.trim().length > 0 &&
      draft.type.trim().length > 0 &&
      draft.visibleScope.trim().length > 0 &&
      draft.publishStatus.trim().length > 0 &&
      draft.content.trim().length > 0
    );
  });

  /**
   * 生效日期
   */
  readonly effectiveDateValue = computed<Date | null>(() => {
    return this.parseDate(this.draft().effectiveDate);
  });

  /**
   * 失效日期
   */
  readonly expireDateValue = computed<Date | null>(() => {
    return this.parseDate(this.draft().expireDate);
  });

  // ==================== 生命周期 ====================

  constructor() {
    effect(() => {
      const open = this.open();

      if (!open) {
        return;
      }

      const value = this.value();

      untracked(() => {
        if (value) {
          this.draft.set(structuredClone(value));
        } else {
          this.draft.set(structuredClone(DEFAULT_FORM));
        }
      });
    });
  }

  // ==================== 更新字段 ====================

  updateField<K extends keyof NoticeFormValue>(key: K, value: NoticeFormValue[K]): void {
    this.draft.update((draft) => ({
      ...draft,

      [key]: value,
    }));
  }

  // ==================== 日期 ====================

  onEffectiveDateChange(value: Date | null): void {
    this.updateField('effectiveDate', this.formatDate(value));
  }

  onExpireDateChange(value: Date | null): void {
    this.updateField('expireDate', this.formatDate(value));
  }

  private parseDate(value: string): Date | null {
    if (!value?.trim()) {
      return null;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDate(value: Date | null): string {
    if (!value) {
      return '';
    }

    const year = value.getFullYear();

    const month = `${value.getMonth() + 1}`.padStart(2, '0');

    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ==================== 提交 ====================

  submitForm(): void {
    if (this.busy() || !this.canSubmit()) {
      return;
    }

    const draft = this.draft();

    this.submit.emit({
      ...draft,

      title: draft.title.trim(),

      content: draft.content.trim(),
    });
  }
}
