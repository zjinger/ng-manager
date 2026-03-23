import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../shared/ui/dialog/dialog-shell.component';
import { FormActionsComponent } from '../../../shared/ui/form-actions/form-actions.component';
import type { CreateSharedConfigInput, SharedConfigEntity } from '../models/shared-config.model';

type Draft = Omit<CreateSharedConfigInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  scope: 'project',
  configKey: '',
  configName: '',
  category: '',
  valueType: 'string',
  configValue: '',
  description: '',
  isEncrypted: false,
  priority: 0,
};

@Component({
  selector: 'app-config-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="isEdit() ? '编辑共享配置' : '新建共享配置'"
      [subtitle]="'录入 key、名称和值，后续再补更细的配置体验。'"
      [icon]="'setting'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="config-form" class="dialog-form" (ngSubmit)="submitForm()">
          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">配置名称</span>
              <input nz-input [ngModel]="draft().configName" name="configName" (ngModelChange)="updateField('configName', $event)" />
            </label>
            <label class="dialog-field">
              <span class="dialog-field__label">配置 Key</span>
              <input nz-input [disabled]="isEdit()" [ngModel]="draft().configKey" name="configKey" (ngModelChange)="updateField('configKey', $event)" />
            </label>
          </div>

          <div class="dialog-form__grid dialog-form__grid--three">
            <label class="dialog-field">
              <span class="dialog-field__label">范围</span>
              <nz-select [ngModel]="draft().scope" name="scope" (ngModelChange)="updateField('scope', $event)">
                <nz-option nzLabel="项目" nzValue="project"></nz-option>
                <nz-option nzLabel="全局" nzValue="global"></nz-option>
              </nz-select>
            </label>
            <label class="dialog-field">
              <span class="dialog-field__label">分类</span>
              <input nz-input [ngModel]="draft().category" name="category" (ngModelChange)="updateField('category', $event)" />
            </label>
            <label class="dialog-field">
              <span class="dialog-field__label">值类型</span>
              <nz-select [ngModel]="draft().valueType" name="valueType" (ngModelChange)="updateField('valueType', $event)">
                <nz-option nzLabel="string" nzValue="string"></nz-option>
                <nz-option nzLabel="number" nzValue="number"></nz-option>
                <nz-option nzLabel="boolean" nzValue="boolean"></nz-option>
                <nz-option nzLabel="json" nzValue="json"></nz-option>
              </nz-select>
            </label>
          </div>

          <label class="dialog-field">
            <span class="dialog-field__label">配置值</span>
            <textarea nz-input rows="6" [ngModel]="draft().configValue" name="configValue" (ngModelChange)="updateField('configValue', $event)"></textarea>
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">说明</span>
            <textarea nz-input rows="3" [ngModel]="draft().description" name="description" (ngModelChange)="updateField('description', $event)"></textarea>
          </label>

          <div class="dialog-form__grid dialog-form__grid--wide">
            <label class="dialog-field">
              <span class="dialog-field__label">优先级</span>
              <nz-input-number [nzMin]="0" [ngModel]="draft().priority" name="priority" (ngModelChange)="updateField('priority', $event ?? 0)"></nz-input-number>
            </label>
            <label class="config-checkbox">
              <input nz-checkbox type="checkbox" [ngModel]="draft().isEncrypted" name="isEncrypted" (ngModelChange)="updateField('isEncrypted', $event)" />
              <span>加密存储</span>
            </label>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" type="submit" form="config-form" [nzLoading]="busy()" [disabled]="!canSubmit()">
            {{ isEdit() ? '保存配置' : '创建配置' }}
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
      .dialog-form__grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .config-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
      }
      @media (max-width: 900px) {
        .dialog-form__grid--wide,
        .dialog-form__grid--three {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigFormDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<SharedConfigEntity | null>(null);
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
            scope: value.scope,
            configKey: value.configKey,
            configName: value.configName,
            category: value.category,
            valueType: value.valueType,
            configValue: value.configValue,
            description: value.description ?? '',
            isEncrypted: value.isEncrypted,
            priority: value.priority,
          });
        } else {
          this.draft.set({ ...DEFAULT_DRAFT });
        }
      }
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.configKey.trim().length > 0 && draft.configName.trim().length > 0 && draft.configValue.trim().length > 0;
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
      configKey: draft.configKey.trim(),
      configName: draft.configName.trim(),
      category: draft.category?.trim() || '',
      configValue: draft.configValue.trim(),
      description: draft.description?.trim() || '',
      valueType: draft.valueType?.trim() || 'string',
      priority: Number(draft.priority ?? 0),
    });
  }
}
